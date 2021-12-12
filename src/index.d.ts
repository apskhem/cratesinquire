interface DepNode extends Partial<Dependency> {
  children: DepNode[];
}

/* components */
interface Dependency {
  crate_id: string;
  default_features: boolean;
  downloads: number;
  features: string[];
  id: number;
  kind: string;
  optional: boolean;
  req: string;
  target: null;
  version_id: number;
}

/* api response */
interface DependenciesResponse {
  dependencies: Dependency[];
}

interface CrateResponse {
  categories: {
    category: string;
    crates_cnt: number;
    created_at: string;
    description: string;
    id: string;
    slug: string;
  }[];
  crate: {
    badges: string[];
    categories: string[];
    created_at: string;
    description: string;
    documentation: string;
    downloads: number;
    exact_match: boolean;
    homepage: string;
    id: string;
    keywords: string[];
    links: {
      owner_team: string;
      owner_user: string;
      owners: string;
      reverse_dependencies: string;
      version_downloads: string;
      versions: null;
    };
    max_stable_version: string;
    max_version: string;
    name: string;
    newest_version: string;
    recent_downloads: number;
    repository: string;
    updated_at: string;
    versions: number[];
  };
  keywords: {
    crates_cnt: number;
    created_at: string;
    id: string;
    keyword: string;
  }[];
  versions: {
    audit_actions: {
      action: string;
      time: string;
      user: {
        avatar: string;
        id: number;
        login: string;
        name: string;
        url: string;
      };
    }[];
    crate: string;
    crate_size: number;
    created_at: string;
    dl_path: string;
    downloads: number;
    features: {
      [key: string]: string[];
    };
    id: number;
    license: string;
    links: {
      authors: string;
      dependencies: string;
      version_downloads: string;
    };
    num: string;
    published_by: {
      avatar: string;
      id: number;
      login: string;
      name: string;
      url: string;
    };
    readme_path: string;
    updated_at: string;
    yanked: boolean;
  }[];
}

interface SearchResponse {
  crates: {
    badges: [];
    categories: null;
    created_at: string;
    description: string;
    documentation: string;
    downloads: number;
    exact_match: boolean;
    homepage: null;
    id: string;
    keywords: null;
    links: {
      owner_team: string;
      owner_user: string;
      owners: string;
      reverse_dependencies: string;
      version_downloads: string;
      versions: string;
    };
    max_stable_version: string;
    max_version: string;
    name: string;
    newest_version: string;
    recent_downloads: number;
    repository: string;
    updated_at: string;
    versions: null;
  }[];
  meta: {
    next_page: string | null;
    prev_page: string | null;
    total: number;
  };
}

interface DownloadsResponse {
  meta: {
    extra_downloads: {
      date: string;
      downloads: number;
    }[];
  };
  version_downloads: {
    date: string;
    downloads: number;
    version: number;
  }[];
}
