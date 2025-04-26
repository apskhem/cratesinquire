import { sift } from "radash";
import semver from "semver";
import {
  crateCache,
  crateVersionCache,
  crateVersionDepsCache,
  withCache
} from "./cache.service";
import {
  fetchCrateData,
  fetchCrateDepsData,
  fetchCrateWithVersionData
} from "./page.service";

type CrateID = string; // `${id}
type CrateIDVersion = string; // `${id}:${semver}
type FilterOptionCallBack = (x: Dependency) => boolean;

export class DepsFetcher {
  private readonly fetchedLinkCache = new Map<CrateID, DependenciesResponse>();
  private readonly fetchedDepCache = new Map<CrateID, Dependency>();
  private readonly fetchedDataCache = new Map<CrateID, CrateVersionData>();

  async fetchTreemapData(versionData: CrateResponse["versions"][number]) {
    /* get response */
    const extractedDataList = await Promise.all<CrateVersionResponse | null>(
      Array.from(this.fetchedDepCache).map(([id, attr]) => {
        const fetch = async () => {
          const versions = await withCache(crateCache, id, () =>
            fetchCrateData(id)
          ).then((x) => x.versions.map((x) => x.num));
          const closestVersion = semver.maxSatisfying(versions, attr?.req);

          return closestVersion
            ? await withCache(
                crateVersionCache,
                `${id}:${closestVersion}`,
                () => fetchCrateWithVersionData(id, closestVersion)
              )
            : null;
        };

        return fetch();
      })
    );

    if (versionData) {
      extractedDataList.push({ version: versionData });
    }

    /* cache data */
    sift(extractedDataList).forEach(
      ({ version }) =>
        version && this.fetchedDataCache.set(version?.crate, version)
    );

    /* process data */
    const children = sift(extractedDataList)
      .filter(({ version }) => version?.crate && version?.crate_size)
      .map(({ version }) => ({
        name: version.crate,
        value: version.crate_size
      }))
      .sort((a, b) => b.value - a.value);

    const treemapRoot = {
      name: "N/A",
      children
    };

    return {
      treemapRoot,
      unknownSizeCrate: extractedDataList.length - children.length
    };
  }

  async fetchBaseDepTree(
    id: string,
    num: string,
    filterCallback: FilterOptionCallBack
  ) {
    const data = await withCache(crateVersionDepsCache, `${id}:${num}`, () =>
      fetchCrateDepsData(id, num)
    );

    if ("errors" in data) {
      throw new Error("insufficient crate versions");
    }

    await this.fetchDepTreeRecursively(id, data, 10, filterCallback);
  }

  private async fetchDepTreeRecursively(
    rootId: string,
    res: DependenciesResponse,
    depth: number,
    filterCallback: FilterOptionCallBack
  ) {
    this.fetchedLinkCache.set(rootId, res);

    if (!res.dependencies || !res.dependencies.length || depth === 1) {
      return;
    }

    const reqDeps = res.dependencies
      .filter(filterCallback)
      .filter((x) => !this.fetchedLinkCache.has(x.crate_id));

    const extractedDataList = await Promise.all<DependenciesResponse | null>(
      reqDeps.map((dep) => {
        const fetch = async () => {
          const versions = await withCache(crateCache, dep.crate_id, () =>
            fetchCrateData(dep.crate_id)
          ).then((x) => x.versions.map((x) => x.num));
          const closestVersion = semver.maxSatisfying(versions, dep.req);

          return closestVersion
            ? await withCache(
                crateVersionDepsCache,
                `${dep.crate_id}:${closestVersion}`,
                () => fetchCrateDepsData(dep.crate_id, closestVersion)
              )
            : null;
        };

        return fetch();
      })
    );

    reqDeps.forEach((x) => this.fetchedDepCache.set(x.crate_id, x));

    await Promise.all(
      extractedDataList.map(
        (d, i) =>
          d &&
          this.fetchDepTreeRecursively(
            reqDeps[i]?.crate_id ?? "",
            d,
            depth - 1,
            filterCallback
          )
      )
    );
  }

  constructDepsLink(id: string, num: string): DepGraph {
    const depGraph: DepGraph = {
      nodes: Array.from(this.fetchedLinkCache.keys()).map((id) => ({
        id,
        attr: this.fetchedDepCache.get(id)
      })),
      links: []
    };

    this.constructDepLinkRecursively(id, 1, depGraph.links);

    // remove node that doesn't have any links
    if (depGraph.nodes.length > 1) {
      depGraph.nodes = depGraph.nodes.filter((x) =>
        depGraph.links.some((y) => x.id === y.source || x.id === y.target)
      );
    }

    return depGraph;
  }

  private constructDepLinkRecursively(
    rootId: string,
    distance: number,
    links: DepGraph["links"]
  ) {
    this.fetchedLinkCache.get(rootId)?.dependencies?.forEach((x) => {
      if (
        !this.fetchedLinkCache.has(x.crate_id) ||
        this.isLinkExist(rootId, x.crate_id, links)
      ) {
        return;
      }

      links.push({
        source: rootId,
        target: x.crate_id,
        distance
      });

      this.constructDepLinkRecursively(x.crate_id, distance + 1, links);
    });
  }

  private isLinkExist(
    source: string,
    target: string,
    links: DepGraph["links"]
  ): boolean {
    return links.some((x) => x.source === source && x.target === target);
  }
}
