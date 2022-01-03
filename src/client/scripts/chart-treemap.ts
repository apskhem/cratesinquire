import * as d3 from "d3";

const WIDTH = Math.min(900, window.innerWidth);
const HEIGHT = Math.min(282);

type Data = {
  name: string;
  children: {
    name: string;
    value: number;
  }[];
};

export const renderTreemap = (rootId: string, data: Data) => {
  const totalSize = data.children.reduce((acc, x) => acc + x.value, 0);
  const root = d3.hierarchy(data).sum((d) => d.value); // Here the size of each leave is given in the 'value' field in input data

  // Then d3.treemap computes the position of each element of the hierarchy
  d3.treemap()
    .size([ WIDTH, HEIGHT ])
    .padding(2)(root);

  const svg = d3
    .create("svg")
    .attr("viewBox", [ 0, 0, WIDTH, HEIGHT ].join(" "));

  const g = svg.append("g");

  // use this information to add rectangles:
  g
    .selectAll("rect")
    .data(root.leaves())
    .join("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("stroke", (d) => d.data.name === rootId ? "#c48b21" : d3.interpolateWarm(d.data.value / totalSize))
    .attr("fill", (d) => d.data.name === rootId ? "#fdc659" : d3.interpolateWarm(d.data.value / totalSize))
    .attr("fill-opacity", 0.4);

  // and to add the text labels
  g
    .selectAll("text")
    .data(root.leaves())
    .join("text")
    .attr("x", (d) => d.x0 + 4) // +10 to adjust position (more right)
    .attr("y", (d) => d.y0 + 12) // +20 to adjust position (lower)
    .text((d) => (d.x1 - d.x0) * (d.y1 - d.y0) > 650 ? d.data.name : "")
    .attr("font-size", "0.5rem")
    .on("click", (e, d) => window.location.href = `/crates/${d.data.name}`);
    // .attr("transform", (d) => `rotate(90,${d.x0 + 10},${d.y0})`);

  return svg.node();
};
