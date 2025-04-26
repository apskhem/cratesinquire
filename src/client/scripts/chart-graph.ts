import * as d3 from "d3";

const MARGIN = {
  top: 100,
  left: 100,
  bottom: 100,
  right: 100
};
const WIDTH = Math.min(900, window.innerWidth);
const HEIGHT = Math.min(212);

export const renderGraph = (data: DepGraph) => {
  const maxDistance = data.links.reduce(
    (acc, x) => Math.max(acc, x.distance),
    0
  );

  const svg = d3.create("svg");
  const defs = svg.append("defs");
  const g = svg.append("g");

  defs
    .selectAll("marker")
    .data(d3.range(0, maxDistance + 1))
    .join("marker")
    .attr("id", (d) => `end-arrow-${d}`)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", "15.5")
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", (d) =>
      d === 0 ? "#FDC659" : d3.interpolateCool(d / maxDistance)
    );

  // content group
  const link = g
    .append("g")
    .selectAll("path")
    .data(data.links)
    .join("path")
    .attr("fill", "none")
    .attr("stroke", (d) => d3.interpolateCool(d.distance / maxDistance))
    .attr("stroke-width", 1.5)
    .attr("marker-end", (d) => `url(#end-arrow-${d.distance})`);

  // Initialize the nodes
  const node = g.selectAll("g").data(data.nodes).join("g");

  const nodeCircle = node
    .append("circle")
    .attr("fill", (d) => (d.id === data.nodes[0]?.id ? "#FDC659" : "#62727A"))
    .attr("stroke", (d) =>
      d.id === data.nodes[0]?.id
        ? d3.interpolateCool(1 / maxDistance)
        : data.links.every((x) => x.source !== d.id)
          ? "rgba(214, 96, 77)"
          : null
    )
    .attr("stroke-width", (d) =>
      d.id === data.nodes[0]?.id || data.links.every((x) => x.source !== d.id)
        ? 2
        : null
    )
    .attr("r", 6)
    .on("mouseover", (e, d) => {
      const sourceLink = link.filter((u) => u.source.id === d.id);
      const excludedSourceLink = link.filter((u) => u.source.id !== d.id);

      const targets = [] as string[];
      sourceLink.each((u) => targets.push(u.target.id));
      const excludedSourceNode = nodeCircle.filter(
        (u) => !targets.includes(u.id) && u.id !== d.id
      );
      const excludedSourceLabel = nodeLabel.filter(
        (u) => !targets.includes(u.id) && u.id !== d.id
      );

      sourceLink
        .attr("stroke", "#FDC659")
        .attr("marker-end", (d) => `url(#end-arrow-${0})`);
      excludedSourceLink.attr("opacity", 0.4);
      excludedSourceNode.attr("opacity", 0.4);
      excludedSourceLabel.attr("opacity", 0.4);
    })
    .on("mouseleave", (e, d) => {
      const sourceLink = link.filter((u) => u.source.id === d.id);
      const excludedSourceLink = link.filter((u) => u.source.id !== d.id);

      const targets = [] as string[];
      sourceLink.each((u) => targets.push(u.target.id));
      const excludedSourceNode = nodeCircle.filter(
        (u) => !targets.includes(u.id) && u.id !== d.id
      );
      const excludedSourceLabel = nodeLabel.filter(
        (u) => !targets.includes(u.id) && u.id !== d.id
      );

      sourceLink
        .attr("stroke", (d) => d3.interpolateCool(d.distance / maxDistance))
        .attr("marker-end", (d) => `url(#end-arrow-${d.distance})`);
      excludedSourceLink.attr("opacity", null);
      excludedSourceNode.attr("opacity", null);
      excludedSourceLabel.attr("opacity", null);
    });

  const nodeLabel = node
    .append("text")
    .attr("dy", "0.31em")
    .attr("dx", "0.86em")
    .attr("font-size", "0.75rem")
    .attr("pointer-events", (d) =>
      d.id === data.nodes[0]?.id ? "none" : "auto"
    )
    .text((d) => [d.id, d.attr?.req].join(" "))
    .on("click", (e, d) => (window.location.href = `/crates/${d.id}`));

  const nodeSubLable = nodeLabel
    .clone(true)
    .lower()
    .attr("stroke", "white")
    .attr("stroke-width", 2);

  // This function is run at each iteration of the force algorithm, updating the nodes position.
  const handleTick = () => {
    link.attr("d", (d) => {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy);

      const pathData = `M ${d.source.x} ${d.source.y} A ${dr} ${dr} 0 0 1 ${d.target.x} ${d.target.y}`;

      return pathData;
    });

    nodeCircle.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    nodeLabel.attr("x", (d) => d.x).attr("y", (d) => d.y);
    nodeSubLable.attr("x", (d) => d.x).attr("y", (d) => d.y);

    const box = data.nodes.reduce(
      (acc, x) => {
        return [
          Math.min(acc[0], x.x),
          Math.min(acc[1], x.y),
          Math.max(acc[2], x.x),
          Math.max(acc[3], x.y)
        ];
      },
      [data.nodes[0]?.x, data.nodes[0]?.y, data.nodes[0]?.x, data.nodes[0]?.y]
    );

    const w = Math.max(box[2] - box[0], WIDTH);
    const h = Math.max(box[3] - box[1], HEIGHT);

    svg.attr(
      "viewBox",
      [
        box[0] - MARGIN.left,
        box[1] - MARGIN.top,
        w + MARGIN.right,
        h + MARGIN.bottom
      ].join(" ")
    );
    g.attr("transform", `translate(${-MARGIN.left / 2},${-MARGIN.top / 2})`);
  };

  // Let's list the force we wanna apply on the network
  const simulation = d3
    .forceSimulation(data.nodes)
    .force(
      "link",
      d3
        .forceLink()
        .id((d) => d.id)
        .links(data.links)
    )
    .force("charge", d3.forceManyBody().strength(-350))
    .force("center", d3.forceCenter(WIDTH / 2, HEIGHT / 2))
    .on("tick", handleTick);

  return svg.node();
};
