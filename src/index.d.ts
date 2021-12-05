interface CurrentCrate {
  categories: {
    category: string;
    crates_cnt: number;
    created_at: string;
    description: string;
    id: string;
    slug: string;
  }[];
  crate: {
    [key: string]: string;
  };
  keywords: {
    crates_cnt: number;
    created_at: string;
    id: string;
    keyword: string;
  }[];
  versions: {
    crate: string;
    crate_size: number;
    created_at: string;
    dl_path: string;
    downloads: number;
    features: {
      [key: string]: string[];
    };
    num: string;
  }[];
}

interface SearchResponse {
  crates: {
    badges: [],
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
        owner_user: string
        owners: string;
        reverse_dependencies: string;
        version_downloads: string;
        versions: string
    };
    max_stable_version: string;
    max_version: string;
    name: string;
    newest_version: string;
    recent_downloads: number;
    repository: string;
    updated_at: string;
    versions: null
  }[];
  meta: {
    next_page: string | null;
    prev_page: string | null;
    total: number;
  }
}