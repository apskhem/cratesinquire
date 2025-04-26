import * as d3 from "d3";

// set the dimensions and margins of the graph
const MARGIN = { top: 10, right: 50, bottom: 30, left: 50 };
const WIDTH = Math.min(900, window.innerWidth) - MARGIN.left - MARGIN.right;
const HEIGHT = 320 - MARGIN.top - MARGIN.bottom;

// returns slope, intercept and r-square of the line
const leastSquares = (
  xSeries: number[],
  ySeries: number[]
): [number, number, number] => {
  const reduceSumFunc = (prev: number, cur: number) => prev + cur;

  const xBar = xSeries.reduce(reduceSumFunc, 0) / xSeries.length;
  const yBar = ySeries.reduce(reduceSumFunc, 0) / ySeries.length;

  const ssXX = xSeries
    .map((d) => Math.pow(d - xBar, 2))
    .reduce(reduceSumFunc, 0);

  const ssYY = ySeries
    .map((d) => Math.pow(d - yBar, 2))
    .reduce(reduceSumFunc, 0);

  const ssXY = d3
    .zip(xSeries, ySeries)
    .map(([x = 0, y = 0]) => (x - xBar) * (y - yBar))
    .reduce(reduceSumFunc, 0);

  const slope = ssXY / ssXX;
  const intercept = yBar - xBar * slope;
  const rSquare = Math.pow(ssXY, 2) / (ssXX * ssYY);

  return [slope, intercept, rSquare];
};

export const renderTrends = (data: TrendData, keys: string[]) => {
  const yValues = new Map<Date, number>();
  const maxYScale = data.reduce((acc, x) => {
    const sum = Object.entries(x)
      .filter((x) => x[0] !== "date")
      .reduce((acc, x) => acc + x[1], 0);

    yValues.set(new Date(x.date), sum);

    return Math.max(acc, sum);
  }, 0);

  // A color scale: one color for each group
  const color = d3
    .scaleOrdinal<string>()
    .domain(keys)
    .range(["#4393c3", "#92c5df", "#f4a582", "#d6604d", "#b2172b", "#670020"]);

  const stackedData = d3.stack().keys(keys).order(d3.stackOrderReverse)(data);

  // append the svg object to the body of the page
  const svg = d3
    .create("svg")
    .attr(
      "viewBox",
      [
        0,
        0,
        WIDTH + MARGIN.left + MARGIN.right,
        HEIGHT + MARGIN.top + MARGIN.bottom
      ].join(" ")
    );

  const g = svg
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  // Add X axis --> it is a date format
  const x = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => new Date(d.date)) as [Date, Date])
    .range([0, WIDTH]);
  const xAxis = g
    .append("g")
    .attr("transform", `translate(0, ${HEIGHT})`)
    .call(d3.axisBottom(x));

  // Add Y axis
  const y = d3
    .scaleLinear()
    .domain([0, maxYScale * 1.05])
    .range([HEIGHT, 0]);
  g.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".1s")));

  // BRUSHING AND CHART //

  // Add a clipPath: everything out of this area won't be drawn.
  const clip = g
    .append("defs")
    .append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", WIDTH)
    .attr("height", HEIGHT)
    .attr("x", 0)
    .attr("y", 0);

  // Add brushing
  /* const brush = d3.brushX() // Add the brush feature using the d3.brush function
    .extent([[ 0, 0 ], [ WIDTH, HEIGHT ]]) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
    .on("end", updateChart); // Each time the brush selection changes, trigger the 'updateChart' function */

  // Create the scatter variable: where both the circles and the brush take place
  const areaChart = g.append("g").attr("clip-path", "url(#clip)");

  // Area generator
  const area = d3
    .area()
    .curve(d3.curveCatmullRom)
    .x((d) => x(d.data.date))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]));

  // Show the areas
  const stackLayer = areaChart
    .selectAll("path")
    .data(stackedData)
    .join("path")
    .attr("stroke", (d) => color(d.key))
    .attr("fill", (d) => color(d.key))
    .attr("fill-opacity", 0.4)
    .attr("d", area);

  // add trendline
  const xScale = d3
    .scaleLinear<number>()
    .domain([1, yValues.size + 1])
    .range([0, WIDTH]);

  // set ranges
  const xSeries = d3.range(1, yValues.size + 1);
  const ySeries = Array.from(yValues.values());

  const leastSquaresCoeff = leastSquares(xSeries, ySeries);

  // apply the reults of the least squares regression
  const x1 = xSeries[0];
  const y1 = leastSquaresCoeff[0] + leastSquaresCoeff[1];
  const x2 = xSeries[xSeries.length - 1];
  const y2 = leastSquaresCoeff[0] * xSeries.length + leastSquaresCoeff[1];
  const trendData = [[x1, y1, x2, y2]];
  // const trendSlope = (y2 - y1) / (x2 - x1) * (y2 - y1);

  const trendline = g
    .selectAll(".trendline")
    .data(trendData)
    .join("line")
    .attr("class", "trendline")
    .attr("x1", (d) => xScale(d[0]))
    .attr("y1", (d) => y(d[1]))
    .attr("x2", (d) => xScale(d[2]))
    .attr("y2", (d) => y(d[3]))
    .attr("stroke", "#62727A")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4 2");

  /* svg.append("text")
    .text(`trend coeff: ${(trendSlope).toFixed(3)} (${getTrendKeyword(trendSlope)})`)
    .attr("class", "text-label")
    .attr("x", xScale(2))
    .attr("y", y(maxYScale))
    .attr("font-size", 10); */

  // Add the brushing
  /* areaChart
    .append("g")
    .attr("class", "brush")
    .call(brush);

  let idleTimeout
  const idled = () => {
    idleTimeout = null;
  };

  // A function that update the chart for given boundaries
  function updateChart(event, d) {
    extent = event.selection

    // If no selection, back to initial coordinate. Otherwise, update X axis domain
    if (extent) {
      x.domain([ x.invert(extent[0]), x.invert(extent[1]) ]);
      areaChart.select(".brush").call(brush.move, null); // This remove the grey brush area as soon as the selection has been done
    }
    else {
      if (!idleTimeout) {
        return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
      }

      x.domain(d3.extent(data, (d) => d.date));
    }

    // Update axis and area position
    xAxis.transition().duration(1000).call(d3.axisBottom(x).ticks(5));
    areaChart
      .selectAll("path")
      .transition().duration(1000)
      .attr("d", area);
  } */

  // HIGHLIGHT GROUP //

  // What to do when one group is hovered
  const highlight = (num: string) => {
    stackLayer.attr("opacity", (d) => (d.key === num ? null : 0.1));
  };

  // And when it is not hovered anymore
  const unhighlight = (num: string) => {
    stackLayer.attr("opacity", null);
  };

  return { svg: svg.node(), highlight, unhighlight, leastSquaresCoeff };
};
