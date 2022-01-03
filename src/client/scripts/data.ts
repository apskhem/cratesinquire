import semver from "semver";
import * as d3 from "d3";

type CrateID = string;
type FilterOptionCallBack = (x: Dependency) => boolean;

const fetchedLinkCache = new Map<CrateID, DependenciesResponse>();
const fetchedDepCache = new Map<CrateID, Dependency>();
const fetchedDataCache = new Map<CrateID, CrateVersionData>();
let mainData: CrateResponse | null = null;

export const getMainData = (id: string): CrateResponse => {
  if (mainData) {
    mainData;
  }

  const dataInputEl = d3.select(`#${id}`);
  mainData = JSON.parse(dataInputEl.attr("value")) as CrateResponse;

  dataInputEl.remove();

  return mainData;
};

export const fetchTreemapData = async () => {
  const fetches = Array.from(fetchedDepCache).reduce((acc, [ id, attr ]) => {
    const version = semver.coerce(attr?.req)?.raw;

    return version
      ? [ ...acc, fetch(`https://crates.io/api/v1/crates/${id}/${version}`) ]
      : acc;
  }, [] as Promise<Response>[]);

  /* get response */
  const resList = await Promise.all(fetches);
  const extractedDataList = await Promise.all<{ version: CrateVersionData; }>(resList.map((x) => x.json()));

  /* append root if available */
  const u = mainData?.versions[0];
  if (u) {
    extractedDataList.push({ version: u });
  }

  /* cache data */
  extractedDataList.forEach(({ version }) => version && fetchedDataCache.set(version?.crate, version));

  /* process data */
  const children = extractedDataList
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
};

export const fetchBaseDepTree = async (id: string, num: string, filterCallback: FilterOptionCallBack) => {
  const res = await fetch(`https://crates.io/api/v1/crates/${id}/${num}/dependencies`);
  const data = await res.json() as DependenciesResponse;

  if ("errors" in data) {
    throw new Error("insufficient crate versions");
  }

  await fetchDepTreeRecursively(id, data, 10, filterCallback);

  return fetchedLinkCache;
};

const fetchDepTreeRecursively = async (rootId: string, res: DependenciesResponse, depth: number, filterCallback: FilterOptionCallBack) => {
  fetchedLinkCache.set(rootId, res);

  if (!res.dependencies || !res.dependencies.length || depth === 1) {
    return;
  }

  const reqDeps = res.dependencies
    .filter(filterCallback)
    .filter((x) => !fetchedLinkCache.has(x.crate_id));

  const fetches = reqDeps.reduce((acc, x) => {
    const version = semver.coerce(x.req)?.raw;

    return version
      ? [ ...acc, fetch(`https://crates.io/api/v1/crates/${x.crate_id}/${version}/dependencies`) ]
      : acc;
  }, [] as Promise<Response>[]);

  const resList = await Promise.all(fetches);
  const extractedDataList = await Promise.all<DependenciesResponse>(resList.map((x) => x.json()));

  reqDeps.forEach((x) => fetchedDepCache.set(x.crate_id, x));

  await Promise.all(extractedDataList.map((d, i) => fetchDepTreeRecursively(reqDeps[i]?.crate_id ?? "", d, depth - 1, filterCallback)));
};

export const constructDepLink = (id: string, num: string) => {
  const depGraph: DepGraph = {
    nodes: Array.from(fetchedLinkCache.keys()).map((id) => ({ id, attr: fetchedDepCache.get(id) })),
    links: []
  };

  constructDepLinkRecursively(id, 1, depGraph.links);

  // remove node that don't have any links
  if (depGraph.nodes.length > 1) {
    depGraph.nodes = depGraph.nodes.filter((x) => depGraph.links.some((y) => x.id === y.source || x.id === y.target));
  }

  return depGraph;
};

const constructDepLinkRecursively = (rootId: string, distance: number, links: DepGraph["links"]) => {
  fetchedLinkCache.get(rootId)?.dependencies?.forEach((x) => {
    if (!fetchedLinkCache.has(x.crate_id) || isLinkExist(rootId, x.crate_id, links)) {
      return;
    }

    links.push({
      source: rootId,
      target: x.crate_id,
      distance
    });

    constructDepLinkRecursively(x.crate_id, distance + 1, links);
  });
};

const isLinkExist = (source: string, target: string, links: DepGraph["links"]) => {
  return links.some((x) => x.source === source && x.target === target);
};
