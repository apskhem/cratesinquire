import * as d3 from "d3";
import semver from "semver";

const getDepTree = async (id: string, version: string) => {
  const root = {
    name: id,
    children: []
  };

  const res = await fetch(`https://crates.io/api/v1/crates/${id}/${version}/dependencies`);
  const data = await res.json() as DependenciesResponse;

  await getDepTreeRecursively(root, data, 10);

  return root;
}

const getDepTreeRecursively = async (root: DepNode, res: DependenciesResponse, dep: number) => {
  if (res.dependencies?.length) {
    const nonDevDep = res.dependencies.filter((x: any) => x.kind !== "dev" && !x.optional);

    const fetches = nonDevDep.map((x: any) => {
      const ver = semver.coerce(x.req)?.raw;
      return fetch(`https://crates.io/api/v1/crates/${x.crate_id}/${ver}/dependencies`)
    });

    const resAll = await Promise.all<Response>(fetches);
    const dataAll = await Promise.all(resAll.map((x) => x.json()));

    root.children = nonDevDep.map((x: any) => ({
      name: x.crate_id,
      children: []
    }));

    if (dep === 1) {
      return root;
    }

    await Promise.all(dataAll.map((data, i) => getDepTreeRecursively(root.children[i], data, dep - 1)));
  }
  
  return root;
}

/* graph element */
const width = 954;

const tree = (data: DepNode) => {
  const root = d3.hierarchy(data);
  root["dx"] = 10;
  root["dy"] = width / (root.height + 1);

  return d3.tree().nodeSize([ root["dx"], root["dy"] ])(root);
}

const chart = async (id: string, version: string) => {
  const data = await getDepTree(id, version);
  const root = tree(data);

  let x0 = Infinity;
  let x1 = -x0;
  root.each((d) => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  const svg = d3
    .create("svg")
    .attr("viewBox", [ 0, 0, width, x1 - x0 + root["dx"] * 2 ] as any);

  const g = svg.append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("transform", `translate(${root["dy"] / 3},${root["dx"] - x0})`);

  const link = g.append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr("d", d3.linkHorizontal()
      .x((d) => d["y"])
      .y((d) => d["x"]) as any
    );

  const node = g.append("g")
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 3)
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("transform", (d) => `translate(${d.y},${d.x})`);

  node.append("circle")
    .attr("fill", (d) => d.children ? "#555" : "#999")
    .attr("r", 2.5);

  node.append("text")
    .attr("dy", "0.31em")
    .attr("x", (d) => d.children ? -6 : 6)
    .attr("font-size", "1em")
    .attr("text-anchor", (d) => d.children ? "end" : "start")
    .text((d) => d.data["name"])
    .clone(true).lower()
    .attr("stroke", "white");

  return svg.node();
}

export default chart;
