import semver from "semver";
import * as d3 from "d3";

type CratePairIDNum = string;
type FilterOptionCallBack = (x: Dependency) => boolean;

const fetchedLinkMap = new Map<CratePairIDNum, DependenciesResponse>();
const fetchedDepMap = new Map<CratePairIDNum, Dependency>();
const fetchedDataMap = new Map<CratePairIDNum, CrateVersionData>();
let mainData: CrateResponse | null = null;

export const getMainData = (id: string): NonNullable<typeof mainData> => {
  if (mainData) {
    mainData;
  }

  const dataInputEl = d3.select(`#${id}`);
  mainData = JSON.parse(dataInputEl.attr("value")) as NonNullable<typeof mainData>;

  dataInputEl.remove();

  return mainData;
};

export const fetchTreemapData = async (id: string, num: string) => {
  const fetches = Array.from(fetchedDepMap).reduce((acc, [ id, attr ]) => {
    const num = semver.coerce(attr?.req)?.raw;

    return num
      ? [ ...acc, fetch(`https://crates.io/api/v1/crates/${id}/${num}`) ]
      : acc;
  }, [] as Promise<Response>[]);

  const root = fetch(`https://crates.io/api/v1/crates/${id}/${num}`);
  const resList = await Promise.all([ ...fetches, root ]);
  const extractedDataList = await Promise.all<{ version: CrateVersionData; }>(resList.map((x) => x.json()));

  const filteredItems = extractedDataList.filter((x) => x?.version?.crate && x?.version?.crate_size);
  const unknownSizeCrate = extractedDataList.length - filteredItems.length;
  const children = filteredItems.map((x) => ({
    name: x.version.crate,
    value: x.version.crate_size
  })).sort((a, b) => b.value - a.value);

  const treemapRoot = {
    name: "N/A",
    children
  };

  return {
    treemapRoot,
    unknownSizeCrate
  };
};

export const fetchBaseDepTree = async (id: string, num: string, filterCallback: FilterOptionCallBack) => {
  const res = await fetch(`https://crates.io/api/v1/crates/${id}/${num}/dependencies`);
  const data = await res.json() as DependenciesResponse;

  await fetchDepTreeRecursively(id, data, 10, filterCallback);

  return fetchedLinkMap;
};

const fetchDepTreeRecursively = async (rootId: string, res: DependenciesResponse, depth: number, filterCallback: FilterOptionCallBack) => {
  if (!res.dependencies || !res.dependencies.length || depth === 1) {
    return;
  }

  fetchedLinkMap.set(rootId, res);

  const reqDeps = res.dependencies
    .filter(filterCallback)
    .filter((x) => !fetchedLinkMap.has(x.crate_id));

  const fetches = reqDeps.reduce((acc, x) => {
    const num = semver.coerce(x.req)?.raw;

    return num
      ? [ ...acc, fetch(`https://crates.io/api/v1/crates/${x.crate_id}/${num}/dependencies`) ]
      : acc;
  }, [] as Promise<Response>[]);

  const resList = await Promise.all(fetches);
  const extractedDataList = await Promise.all<DependenciesResponse>(resList.map((x) => x.json()));

  reqDeps.forEach((x) => fetchedDepMap.set(x.crate_id, x));

  await Promise.all(extractedDataList.map((d, i) => fetchDepTreeRecursively(reqDeps[i]?.crate_id ?? "", d, depth - 1, filterCallback)));
};

export const constructDepLink = (id: string, num: string) => {
  const depGraph: DepGraph = {
    nodes: Array.from(fetchedLinkMap.keys()).map((id) => ({ id, attr: fetchedDepMap.get(id) })),
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
  fetchedLinkMap.get(rootId)?.dependencies.forEach((x) => {
    if (!fetchedLinkMap.has(x.crate_id) || isLinkExist(rootId, x.crate_id, links)) {
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
