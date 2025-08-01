interface GithubRepo {
  owner: string;
  repo: string;
}

interface DetailInfo {
  total: number;
  type: {
    apk: number;
    zip: number;
  };
  source: {
    github: number;
    jsdelivr: number;
    xda: number;
  };
  is_canary: boolean;
}

type VersionInfo = Record<string, DetailInfo>;

type Unpacked<T> = T extends (infer U)[] ? U : T;
