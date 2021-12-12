import * as d3 from "d3";

const WIDTH = 900;

const getTree = <T>(data: T) => {
  const root = d3.hierarchy(data);
  root["dx"] = 10;
  root["dy"] = WIDTH / (root.height + 1);

  const tree = d3.tree<T>().nodeSize([ root["dx"], root["dy"] ])(root);

  return tree;
};

const getBoundScope = (root: ReturnType<typeof getTree>): [number, number] => {
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = -x0;
  root.each((d) => {
    x1 = Math.max(d.x, x1);
    x0 = Math.min(d.x, x0);
  });

  return [ x0, x1 ];
};

export const getDepChart = (data: DepNode) => {
  const root = getTree(data);

  const [ x0, x1 ] = getBoundScope(root);

  const svg = d3.create("svg")
    .attr("viewBox", [ 0, 0, WIDTH, x1 - x0 + root["dx"] * 2 ].join(" "));

  const g = svg.append("g")
    .attr("font-size", 10)
    .attr("transform", `translate(${root["dy"] / 3},${root["dx"] - x0})`);

  const link = g.append("g")
    .attr("fill", "none")
    .attr("stroke", "#62727A")
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
    .attr("fill", "#62727A")
    .attr("r", 2.5);

  node.append("text")
    .attr("dy", "0.31em")
    .attr("x", (d) => d.children ? -6 : 6)
    .attr("font-size", "1em")
    .attr("text-anchor", (d) => d.children ? "end" : "start")
    .attr("pointer-events", (d) => d.data.id === root.id ? "none" : "auto")
    .text((d) => [ d.data.crate_id, d.data.req ].join(" "))
    .on("click", (e, d) => d.data.crate_id ? window.location.href = `/crates/${d.data.crate_id}` : null)
    .clone(true)
    .lower()
    .attr("stroke", "white");

  return svg.node();
};
