import semver from "semver";

const fetchedLinkMap = new Map<string, DependenciesResponse>();
const fetchedDataMap = new Map<string, Dependency | null>();

export const fetchTreemapData = async (id: string, num: string) => {
  const fetches = Array.from(fetchedDataMap).reduce((acc, [ id, attr ]) => {
    const num = semver.coerce(attr?.req)?.raw;

    return num
      ? [ ...acc, fetch(`https://crates.io/api/v1/crates/${id}/${num}`) ]
      : acc;
  }, [] as Promise<Response>[]);

  const root = fetch(`https://crates.io/api/v1/crates/${id}/${num}`);
  const resGroup = await Promise.all([ ...fetches, root ]);
  const dataGroup = await Promise.all<{ version: CrateVersionData; }>(resGroup.map((x) => x.json()));

  return {
    name: "treemap",
    children: dataGroup.filter((x) => x?.version?.crate && x?.version?.crate_size).map((x) => ({
      name: x.version.crate,
      value: x.version.crate_size
    })).sort((a, b) => b.value - a.value)
  };
};

export const fetchBaseDepTree = async (id: string, num: string) => {
  const res = await fetch(`https://crates.io/api/v1/crates/${id}/${num}/dependencies`);
  const data = await res.json() as DependenciesResponse;

  fetchedDataMap.set(id, null);

  await fetchDepTreeRecursively(id, data, 10);

  return fetchedLinkMap;
};

const fetchDepTreeRecursively = async (rootId: string, res: DependenciesResponse, depth: number) => {
  if (!res.dependencies || !res.dependencies.length || depth === 1) {
    return;
  }

  fetchedLinkMap.set(rootId, res);

  const nonDevDep = res.dependencies.filter((x) => !/dev|build/.test(x.kind) && !x.optional);
  const nonDevDepReq = nonDevDep.filter((x) => !fetchedLinkMap.has(x.crate_id));

  const fetches = nonDevDepReq.reduce((acc, x) => {
    const num = semver.coerce(x.req)?.raw;

    return num
      ? [ ...acc, fetch(`https://crates.io/api/v1/crates/${x.crate_id}/${num}/dependencies`) ]
      : acc;
  }, [] as Promise<Response>[]);

  const resGroup = await Promise.all(fetches);
  const dataGroup = await Promise.all<DependenciesResponse>(resGroup.map((x) => x.json()));

  nonDevDepReq.forEach((x) => fetchedDataMap.set(x.crate_id, x));

  await Promise.all(dataGroup.map((d, i) => fetchDepTreeRecursively(nonDevDepReq[i]?.crate_id ?? "", d, depth - 1)));
};

export const constructDepLink = (id: string, num: string) => {
  const depGraph: DepGraph = {
    nodes: Array.from(fetchedLinkMap.keys()).map((id) => ({ id, attr: fetchedDataMap.get(id) ?? null })),
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
    if (!fetchedLinkMap.has(x.crate_id) || isPairExist(rootId, x.crate_id, links)) {
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

const isPairExist = (source: string, target: string, links: DepGraph["links"]) => {
  return links.some((x) => x.source === source && x.target === target);
};
