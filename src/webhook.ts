import Fastify from 'fastify';
import { Webhooks } from '@octokit/webhooks';
import {
  WebhookEventName,
  IssuesEvent,
  PullRequestEvent,
} from '@octokit/webhooks-types';
import { purgeOutdatedCache } from './cache.js';
import {
  blockUser,
  closeIssue,
  closePR,
  commentIssue,
  getVersionCode,
} from './utils.js';

const webhook = new Webhooks({
  secret: process.env.MAGISK_WEBHOOK_SECRET!,
});

webhook.on('issues', async ({ payload }) => {
  const { issue } = payload as IssuesEvent;
  const repo = {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
  };
  if (issue.labels?.some((l) => l.name === 'spam')) {
    await blockUser(issue.user.login);
    if (issue.state !== 'closed') {
      await closeIssue(repo, issue);
    }
    return;
  }
  if (payload.action === 'opened') {
    const versionCodeLine = issue.body
      ?.split('\n')
      .filter((s) => s.startsWith('Magisk version code:'))
      .at(-1);

    const ver = await getVersionCode();
    if (!versionCodeLine?.includes(ver)) {
      const msg =
        'Invalid bug report, automatically closed.\n' +
        `Please report issues using the latest debug Magisk build (version code: ${ver}).`;
      await Promise.all([
        commentIssue(repo, issue, msg),
        closeIssue(repo, issue),
      ]);
    }
  }
});

webhook.on('pull_request', async ({ payload }) => {
  const { pull_request: pr } = payload as PullRequestEvent;
  if (pr.labels.some((l) => l.name === 'spam')) {
    await blockUser(pr.user.login);
    if (pr.state !== 'closed') {
      const repo = {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
      };
      await closePR(repo, pr);
    }
  }
});

webhook.on('workflow_run', async ({ payload }) => {
  if (payload.action === 'completed') {
    await purgeOutdatedCache();
  }
});

const server = Fastify();

server.post('/webhook', async (req, res) => {
  await webhook.verifyAndReceive({
    id: req.headers['x-github-delivery'] as string,
    name: req.headers['x-github-event'] as WebhookEventName,
    payload: JSON.stringify(req.body),
    signature: req.headers['x-hub-signature-256'] as string,
  });
  res.send();
});

server.get('/ping', (_, res) => {
  res.send();
});

export default server;
