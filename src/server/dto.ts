import { z } from "zod";

/* components */

export const DependencySchema = z.object({
  crate_id: z.string(),
  default_features: z.boolean(),
  downloads: z.number(),
  features: z.array(z.string()),
  id: z.number(),
  kind: z.string(),
  optional: z.boolean(),
  req: z.string(),
  target: z.string().nullable(),
  version_id: z.number()
});

export const CrateVersionDataSchema = z.object({
  audit_actions: z.array(
    z.object({
      action: z.string(),
      time: z.string(),
      user: z.object({
        avatar: z.string(),
        id: z.number(),
        login: z.string(),
        name: z.string(),
        url: z.string()
      })
    })
  ),
  crate: z.string(),
  crate_size: z.number(),
  created_at: z.string(),
  dl_path: z.string(),
  downloads: z.number(),
  features: z.record(z.array(z.string())),
  id: z.number(),
  license: z.string(),
  links: z.object({
    authors: z.string(),
    dependencies: z.string(),
    version_downloads: z.string()
  }),
  num: z.string(),
  published_by: z
    .object({
      avatar: z.string(),
      id: z.number(),
      login: z.string(),
      name: z.string(),
      url: z.string()
    })
    .nullable(),
  readme_path: z.string(),
  updated_at: z.string(),
  yanked: z.boolean()
});

/* api responses */

export const DependenciesResponseSchema = z.object({
  dependencies: z.array(DependencySchema)
});

export const CrateVersionResponseSchema = z.object({
  version: CrateVersionDataSchema
});

export const CrateResponseSchema = z.object({
  categories: z.array(
    z.object({
      category: z.string(),
      crates_cnt: z.number(),
      created_at: z.string(),
      description: z.string(),
      id: z.string(),
      slug: z.string()
    })
  ),
  crate: z.object({
    badges: z.array(z.string()),
    categories: z.array(z.string()),
    created_at: z.string(),
    description: z.string(),
    documentation: z.string().nullable(),
    downloads: z.number(),
    exact_match: z.boolean(),
    homepage: z.string().nullable(),
    id: z.string(),
    keywords: z.array(z.string()),
    links: z.object({
      owner_team: z.string(),
      owner_user: z.string(),
      owners: z.string(),
      reverse_dependencies: z.string(),
      version_downloads: z.string(),
      versions: z.null()
    }),
    max_stable_version: z.string(),
    max_version: z.string(),
    name: z.string(),
    newest_version: z.string(),
    recent_downloads: z.number(),
    repository: z.string(),
    updated_at: z.string(),
    versions: z.array(z.number())
  }),
  keywords: z.array(
    z.object({
      crates_cnt: z.number(),
      created_at: z.string(),
      id: z.string(),
      keyword: z.string()
    })
  ),
  versions: z.array(CrateVersionDataSchema)
});

export const SearchResponseSchema = z.object({
  crates: z.array(
    z.object({
      badges: z.array(z.unknown()), // empty array, but unknown items
      categories: z.null(),
      created_at: z.string(),
      description: z.string(),
      documentation: z.string(),
      downloads: z.number(),
      exact_match: z.boolean(),
      homepage: z.null(),
      id: z.string(),
      keywords: z.null(),
      links: z.object({
        owner_team: z.string(),
        owner_user: z.string(),
        owners: z.string(),
        reverse_dependencies: z.string(),
        version_downloads: z.string(),
        versions: z.string()
      }),
      max_stable_version: z.string(),
      max_version: z.string(),
      name: z.string(),
      newest_version: z.string(),
      recent_downloads: z.number(),
      repository: z.string(),
      updated_at: z.string(),
      versions: z.null()
    })
  ),
  meta: z.object({
    next_page: z.string().nullable(),
    prev_page: z.string().nullable(),
    total: z.number()
  })
});

export const DownloadsResponseSchema = z.object({
  meta: z.object({
    extra_downloads: z.array(
      z.object({
        date: z.string(),
        downloads: z.number()
      })
    )
  }),
  version_downloads: z.array(
    z.object({
      date: z.string(),
      downloads: z.number(),
      version: z.number()
    })
  )
});

export const RustSecEntrySchema = z.object({
  package: z.string(),
  description: z.string(),
  details: z.string(),
  date: z.string().date(),
  id: z.string().startsWith("RUSTSEC"),
  aliases: z.array(z.string()).optional(),
  cvss: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

/* script structs */

export const PointSchema = z.object({
  date: z.date(),
  downloads: z.number()
});

/* main struct */

export const DepGraphSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      index: z.number().optional(),
      vx: z.number().optional(),
      vy: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      attr: DependencySchema.nullable().optional()
    })
  ),
  links: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      distance: z.number()
    })
  )
});
