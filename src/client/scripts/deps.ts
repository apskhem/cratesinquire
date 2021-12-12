import semver from "semver";

const dedupMap = new Map<string, DependenciesResponse>();

export const getBaseDepTree = async (id: string, num: string) => {
  const root = {
    crate_id: id,
    children: []
  };

  const res = await fetch(`https://crates.io/api/v1/crates/${id}/${num}/dependencies`);
  const data = await res.json() as DependenciesResponse;

  dedupMap.set(id, data);

  await getDepTreeRecursively(root, data, 10, dedupMap);

  return root;
};

const getDepTreeRecursively = async (root: DepNode, res: DependenciesResponse, depth: number, dedupSet: Map<string, DependenciesResponse>) => {
  if (!res.dependencies || !res.dependencies.length) {
    return root;
  }

  const nonDevDep = res.dependencies.filter((x) => x.kind !== "dev" && !x.optional);
  const nonDevDepReq = nonDevDep.filter((x) => !dedupSet.has(x.crate_id));

  const fetches = nonDevDepReq.map((x) => {
    const num = semver.coerce(x.req)?.raw;
    return fetch(`https://crates.io/api/v1/crates/${x.crate_id}/${num}/dependencies`);
  });

  const resGroup = await Promise.all(fetches);
  const dataGroup = await Promise.all<DependenciesResponse>(resGroup.map((x) => x.json()));

  root.children = nonDevDep.map((x) => {
    // TODO: add correct dependency map
    dedupSet.set(x.crate_id, { dependencies: [] });

    return {
      ...x,
      children: []
    };
  });

  if (depth === 1) {
    return root;
  }

  await Promise.all(dataGroup.map((d, i) => getDepTreeRecursively(root.children[i], d, depth - 1, dedupSet)));
};

export const getDevDepTree = async () => {

};

export const getOptionalDepTree = async () => {

};
