import * as d3 from "d3";

// set the dimensions and margins of the graph
const margin = { top: 10, right: 50, bottom: 30, left: 50 };
const width = 900 - margin.left - margin.right;
const height = 320 - margin.top - margin.bottom;
const baseOpacity = 0.4;

type Point = {
  date: Date;
  downloads: number;
};

type Data = {
  name: string;
  values: Point[];
}[];

export const getTrend = (data: Data) => {
  // List of groups (here I have one group per column)
  const allGroup = data.map((x) => x.name);
  const maxXScale = data.reduce((acc, x) => Math.max(acc, x.values.length), 0);
  const maxYScale = data.reduce((acc, x) => Math.max(acc, x.values.reduce((acc, x) => Math.max(acc, x.downloads), 0)), 0);

  // append the svg object to the body of the page
  const root = d3.create("svg")
    .attr("viewBox", [ 0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom ] as any);

  const svg = root
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // A color scale: one color for each group
  const color = d3.scaleOrdinal<string>()
    .domain(allGroup)
    .range(d3.schemeSet2);

  // Add X axis --> it is a date format
  const x = d3.scaleTime()
    .domain(d3.extent(data[0]?.values, (d) => d.date))
    .range([ 0, width ]);
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  // Add Y axis
  const y = d3.scaleLinear()
    .domain([ 0, maxYScale ])
    .range([ height, 0 ]);
  svg.append("g")
    .call(d3.axisLeft(y));

  // Add the lines
  const line = d3.line<Point>()
    .curve(d3.curveCardinal)
    .x((d) => x(d.date))
    .y((d) => y(d.downloads));

  svg
    .selectAll("myLines")
    .data(data)
    .join("path")
    .attr("class", (d) => `cl-${d.name}`)
    .attr("d", (d) => line(d.values))
    .attr("stroke", (d) => color(d.name))
    .style("stroke-width", 2)
    .style("fill", "none")
    .style("opacity", baseOpacity);

  // Add the points
  svg
    // First we need to enter in a group
    .selectAll("myDots")
    .data(data)
    .join("g")
    .style("fill", (d) => color(d.name))
    .attr("class", (d) => `cl-${d.name}`)
    // Second we need to enter in the "values" part of this group
    .selectAll("myPoints")
    .data((d) => d.values)
    .join("circle")
    .attr("cx", (d) => x(d.date))
    .attr("cy", (d) => y(d.downloads))
    .attr("r", 2.5);

  const handleDisable = (name: string) => {
    const currentOpacity = d3.selectAll(`.cl-${name}`).style("opacity");
    d3.selectAll(`.cl-${name}`).transition().style("opacity", currentOpacity === `${baseOpacity}` ? 0 : baseOpacity);
  };

  return { svg: root.node(), handleDisable };
};
