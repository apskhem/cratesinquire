import {
  applyGroupConfig,
  endpoint,
  HtmlBody,
  HttpResponse,
  LinzEndpointGroup
} from "@apskhem/linz";
import { z } from "zod";
import { crateCache, withCache } from "../services/cache.service";
import { fetchCrateData, getAdvisoriesById } from "../services/page.service";
import { CRATE_PAGE, INDEX_PAGE, NOT_FOUND_PAGE } from "../templates";

const endpoints: LinzEndpointGroup = {
  "get:/": endpoint({
    responses: {
      200: new HtmlBody()
    },
    operationId: "getIndexPage",
    handler: async () => {
      return INDEX_PAGE();
    }
  }),
  "get:/crates/:id": endpoint({
    parameters: {
      path: z.object({
        id: z.string()
      })
    },
    responses: {
      200: new HtmlBody(),
      404: true
    },
    operationId: "getCratePage",
    handler: async ({ params }) => {
      // validate id
      if (!/^[a-zA-Z0-9_-]+$/.test(params.id)) {
        return new HttpResponse({
          status: 400,
          body: NOT_FOUND_PAGE({
            status: 400,
            title: params.id,
            msg: `Could not find "${params.id}" crate.`
          })
        });
      }

      // fetch crate data
      const data = await withCache(crateCache, params.id, () =>
        fetchCrateData(params.id)
      );
      const advisories = getAdvisoriesById(params.id);

      if (!data || "errors" in data) {
        return new HttpResponse({
          status: 404,
          body: NOT_FOUND_PAGE({
            status: 404,
            title: params.id,
            msg: `Could not find "${params.id}" crate.`
          })
        });
      }

      return CRATE_PAGE({
        data: {
          ...data,
          advisories
        }
      });
    }
  })
};

export default applyGroupConfig(endpoints, {
  tags: [],
  security: []
});
