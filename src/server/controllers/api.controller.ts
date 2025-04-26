import {
  ApiError,
  applyGroupConfig,
  endpoint,
  LinzEndpointGroup
} from "@apskhem/linz";
import { z } from "zod";
import { fetchCrateData } from "../services/page.service";
import { crateCache, withCache } from "../services/cache.service";
import { DepsFetcher } from "../services/deps.service";

const endpoints: LinzEndpointGroup = {
  "get:/api/crates/:id/:version/deps": endpoint({
    parameters: {
      path: z.object({
        id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
        version: z.string()
      })
    },
    responses: {
      200: z.object({
        treemapRoot: z.object({
          name: z.string(),
          children: z
            .object({
              name: z.string(),
              value: z.number()
            })
            .array()
        }),
        unknownSizeCrate: z.number().min(0).int(),
        depData: z.object({
          nodes: z
            .object({
              id: z.string(),
              index: z.number().optional(),
              vx: z.number().optional(),
              vy: z.number().optional(),
              x: z.number().optional(),
              y: z.number().optional(),
              attr: z
                .object({
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
                })
                .nullable()
                .optional()
            })
            .array(),
          links: z
            .object({
              source: z.string(),
              target: z.string(),
              distance: z.number()
            })
            .array()
        })
      })
    },
    operationId: "getCrateDeps",
    handler: async ({ params }) => {
      const depsFetcher = new DepsFetcher();

      const data = await withCache(crateCache, params.id, () =>
        fetchCrateData(params.id)
      );

      if (!data) {
        throw new ApiError(
          500,
          "Something went wrong while querying a crate's dependencies"
        );
      }

      await depsFetcher.fetchBaseDepTree(
        params.id,
        params.version,
        (x) => !/dev|build/.test(x.kind) && !x.optional
      );
      const { treemapRoot, unknownSizeCrate } =
        await depsFetcher.fetchTreemapData(data.versions[0]);
      const depData = depsFetcher.constructDepsLink(params.id, params.version);

      return { treemapRoot, unknownSizeCrate, depData };
    }
  })
};

export default applyGroupConfig(endpoints, {
  tags: [],
  security: []
});
