import bytes from "bytes";
import pluralize from "pluralize";
import semver from "semver";
import { getDepTree } from "./deps";
import { getDepChart } from "./tree";
import * as d3 from "d3";
import { initSearchBar } from "./search-bar";

/* utils */
const getData = <T>(id: string): T => {
  const dataInputEl = d3.select(`#${id}`);
  const data = JSON.parse(dataInputEl.attr("value")) as T;

  dataInputEl.remove();

  return data;
};

const getDay = (milsec: number) => {
  return Math.floor(milsec / (1000 * 60 * 60 * 24));
};

const getTimeDiff = (d1: string, d2: string) => {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();

  return t1 - t2;
};

type BarMode = "size" | "downloads" | "lifetime" | "features";

/* structs */
class BarRowElement {
  private readonly rTrack = d3.create("div");
  private readonly rTrackBar = d3.create("div");
  private readonly label = d3.create("a");
  private readonly barContainer = d3.create("div");
  private readonly bar = d3.create("div");
  private readonly innerBarLabel = d3.create("span");

  private readonly data: MainCrate["versions"][number];

  public constructor(data: MainCrate["versions"][number], crateId: string) {
    this.data = data;

    this.rTrack.classed("version-track", true);
    this.bar.classed("bundle-size-bar", true);

    this.label
      .text(data.num)
      .attr("href", `https://crates.io/crates/${crateId}/${data.num}`)
      .attr("target", "_blank");

    if (data.yanked) {
      this.rTrack.classed("yanked", true);
      this.label.classed("yanked", true);
    }
    else if (/pre|alpha|beta|rc|dev|insiders/i.test(data.num)) {
      this.rTrack.classed("pre", true);
      this.label.classed("pre", true);
    }

    // append elements
    this.bar.append(() => this.innerBarLabel.node());
    this.barContainer.append(() => this.bar.node());
    this.rTrack.append(() => this.rTrackBar.node());
  }

  public getSemVer() {
    return semver.coerce(this.data.num);
  }

  public setMinor() {
    this.rTrackBar.classed("majpr", false);
    this.rTrackBar.classed("mark", true).classed("minor", true);
  }

  public setMajor() {
    this.rTrackBar.classed("minor", false);
    this.rTrackBar.classed("mark", true).classed("major", true);
  }

  public setCurrent() {
    this.bar.classed("current", true);

    this.label.html(`<b>${this.data.num}</b>`);
  }

  public setBarMode(mode: BarMode, maxValue: number) {
    switch (mode) {
      case "size": {
        this.bar.style("width", maxValue ? `${this.data.crate_size / maxValue * 100}%` : "0");

        const formattedByteString = this.data.crate_size ? bytes(this.data.crate_size, { unit: "B", thousandsSeparator: "," }) : "N/A";

        this.innerBarLabel.text(formattedByteString);
        break;
      }
      case "downloads": {
        this.bar.style("width", `${this.data.downloads / maxValue * 100}%`);

        this.innerBarLabel.text(this.data.downloads.toLocaleString("en"));
        break;
      }
      case "lifetime": {
        const currentDate = new Date().toISOString();
        const lifetime = getTimeDiff(currentDate, this.data.created_at);
        const lifetimeDay = getDay(lifetime);

        this.bar.style("width", `${lifetime / maxValue * 100}%`);

        this.innerBarLabel.text(`${lifetimeDay.toLocaleString("en")} ${pluralize("day", lifetimeDay)}`);
        break;
      }
      case "features": {
        const featureCount = Object.keys(this.data.features).length;

        this.bar.style("width", maxValue ? `${featureCount / maxValue * 100}%` : "0");

        this.innerBarLabel.text(`${featureCount.toLocaleString("en")} ${pluralize("features", featureCount)}`);
        break;
      }
      default: {
        throw new Error();
      }
    }
  }

  public setParent(parent: d3.Selection<HTMLElement, null, HTMLElement, null>) {
    parent.append(() => this.rTrack.node());
    parent.append(() => this.label.node());
    parent.append(() => this.barContainer.node());
  }
}

/* main */
export const runCrate = async () => {
  initSearchBar();

  const bundleSizeGraphContainer = d3.select<HTMLElement, null>(".graph-container");
  const viewSwitchContainer = d3.select<HTMLElement, null>(".view-swtiches");
  const depTreeContainer = d3.select<HTMLElement, null>(".dep-tree-displayer-container");

  const addButtonEventHandler = (queryString: string, mode: BarMode, maxValue: number) => {
    const el = d3.select<HTMLElement, null>(queryString);

    el.on("click", () => {
      if (el.classed("sel")) {
        return;
      }
  
      viewSwitchContainer.selectAll(".sel").classed("sel", false);
  
      el.classed("sel", true);

      bars.forEach((x) => x.setBarMode(mode, maxValue));
    });
  };

  const data = getData<MainCrate>("data");

  const maxBundleSize = data.versions.reduce((acc, x) => Math.max(acc, x.crate_size), 0);
  const maxDownloads = data.versions.reduce((acc, x) => Math.max(acc, x.downloads), 0);
  const maxLifetime = data.versions.reduce((acc, x) => Math.max(acc, getTimeDiff(new Date().toISOString(), x.created_at)), 0);
  const maxFeatures = data.versions.reduce((acc, x) => Math.max(acc, Object.keys(x.features).length), 0);

  addButtonEventHandler("#switch-crate-size", "size", maxBundleSize);
  addButtonEventHandler("#switch-dowloads", "downloads", maxDownloads);
  addButtonEventHandler("#switch-lifetime", "lifetime", maxLifetime);
  addButtonEventHandler("#switch-features", "features", maxFeatures);

  let minorChange = semver.coerce(data.versions[0].num).minor;
  let majorChange = semver.coerce(data.versions[0].num).major;
  let prevBar: BarRowElement | null = null;

  const bars = data.versions.map((versionContent) => {
    const bar = new BarRowElement(versionContent, data.crate.id);
    const ver = bar.getSemVer();

    if (versionContent.num === data.crate.max_stable_version) {
      bar.setCurrent();
    }
    if (prevBar && ver.major !== majorChange) {
      prevBar.setMajor();

      majorChange = ver.major;
    }
    if (prevBar && ver.minor !== minorChange) {
      prevBar.setMinor();

      minorChange = ver.minor;
    }

    bar.setBarMode("size", maxBundleSize);
    bar.setParent(bundleSizeGraphContainer);

    prevBar = bar;

    return bar;
  });

  // install dep graph
  const depData = await getDepTree(data.crate.id, data.crate.max_stable_version);
  const chartEl = getDepChart(depData);
  depTreeContainer.append(() => chartEl);
  d3.select(".dep-tree-displayer-container > .loader-container").remove();
};
