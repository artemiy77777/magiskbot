import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types';
import { Issue, PullRequest } from '@octokit/webhooks-types';
import { ghOwner as gh, ghBot } from './env.js';

export async function blockUser(username: string) {
  try {
    await gh.users.block({ username });
    console.log(`Blocked: ${username}`);
  } catch (e) {
    // ignore
  }
}

export async function blockAllSpam() {
  const spam = await gh.paginate(gh.issues.listForRepo, {
    owner: 'topjohnwu',
    repo: 'Magisk',
    labels: 'spam',
    state: 'all',
  });
  const spamUsers = new Set(spam.map((e) => e.user!.login));
  return Promise.all([...spamUsers].map(blockUser));
}

export async function closeIssue(repo: GithubRepo, issue: Issue) {
  await ghBot.issues.update({
    ...repo,
    issue_number: issue.number,
    state: 'closed',
  });
}

export async function closePR(repo: GithubRepo, pr: PullRequest) {
  await ghBot.pulls.update({
    ...repo,
    pull_number: pr.number,
    state: 'closed',
  });
}

export async function commentIssue(
  repo: GithubRepo,
  issue: Issue,
  body: string,
) {
  await ghBot.issues.createComment({
    ...repo,
    issue_number: issue.number,
    body,
  });
}

type GhContentType = Unpacked<
  GetResponseDataTypeFromEndpointMethod<typeof ghBot.repos.getContent>
>;

export async function getVersionCode(): Promise<string> {
  const props = (
    await ghBot.repos.getContent({
      owner: 'topjohnwu',
      repo: 'Magisk',
      path: 'app/gradle.properties',
    })
  ).data as GhContentType;

  if (props.type === 'file' && 'encoding' in props) {
    return Buffer.from(props.content, props.encoding as BufferEncoding)
      .toString()
      .split('\n')
      .filter((s) => s.startsWith('magisk.versionCode'))
      .at(-1)!
      .replace('magisk.versionCode=', '');
  }

  return '';
}

export async function lockSpamIssue(repo: GithubRepo, issue: Issue) {
  await ghBot.issues.lock({
    ...repo,
    issue_number: issue.number,
    lock_reason: 'spam',
  });
}

export async function lockSpamPR(repo: GithubRepo, pr: PullRequest) {
  await ghBot.issues.lock({
    ...repo,
    issue_number: pr.number,
    lock_reason: 'spam',
  });
}
