import semver from "semver";

export const getDepTree = async (id: string, version: string) => {
  const root = {
    crate_id: id,
    children: []
  };

  const res = await fetch(`https://crates.io/api/v1/crates/${id}/${version}/dependencies`);
  const data = await res.json() as DependenciesResponse;
  const dedupSet = new Set([ id ]);

  await getDepTreeRecursively(root, data, 10, dedupSet);

  return root;
}

const getDepTreeRecursively = async (root: DepNode, res: DependenciesResponse, dep: number, dedupSet: Set<string>) => {
  if (res.dependencies?.length) {
    const nonDevDep = res.dependencies.filter((x) => x.kind !== "dev" && !x.optional);
    const nonDevDepReq = nonDevDep.filter((x) => !dedupSet.has(x.crate_id));

    const fetches = nonDevDepReq.map((x) => {
      const ver = semver.coerce(x.req)?.raw;
      return fetch(`https://crates.io/api/v1/crates/${x.crate_id}/${ver}/dependencies`);
    });

    const resAll = await Promise.all<Response>(fetches);
    const dataAll = await Promise.all(resAll.map((x) => x.json())) as DependenciesResponse[];

    root.children = nonDevDep.map((x) => {
      dedupSet.add(x.crate_id);

      return {
        ...x,
        children: []
      }
    });

    if (dep === 1) {
      return root;
    }

    await Promise.all(dataAll.map((data, i) => getDepTreeRecursively(root.children[i], data, dep - 1, dedupSet)));
  }
  
  return root;
}
