import semver from "semver";

const dedupMap = new Map<string, DependenciesResponse>();
let builtTree: DepNode | null = null;

export const getBaseDepTree = async (id: string, num: string) => {
  builtTree = {
    crate_id: id,
    children: []
  };

  const res = await fetch(`https://crates.io/api/v1/crates/${id}/${num}/dependencies`);
  const data = await res.json() as DependenciesResponse;

  dedupMap.set(id, data);

  await getDepTreeRecursively(builtTree, data, 10, dedupMap);

  return builtTree;
};

const getDepTreeRecursively = async (root: DepNode, res: DependenciesResponse, depth: number, dedupSet: Map<string, DependenciesResponse>) => {
  if (!res.dependencies || !res.dependencies.length) {
    return root;
  }

  const nonDevDep = res.dependencies.filter((x) => !/dev|build/.test(x.kind) && !x.optional);
  const nonDevDepReq = nonDevDep.filter((x) => !dedupSet.has(x.crate_id));

  const fetches = nonDevDepReq.reduce((acc, x) => {
    const num = semver.coerce(x.req)?.raw;

    return num
      ? acc.concat(fetch(`https://crates.io/api/v1/crates/${x.crate_id}/${num}/dependencies`))
      : acc;
  }, [] as Promise<Response>[]);

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
