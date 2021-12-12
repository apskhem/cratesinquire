import bytes from "bytes";
import pluralize from "pluralize";
import semver from "semver";
import { getDepTree } from "./deps";
import { getDepChart } from "./tree";
import * as d3 from "d3";
import { initSearchBar as possessSearchBar } from "./search-bar";
import { getTrend } from "./trend";

type BarMode = "size" | "downloads" | "lifetime" | "features";

type DisplayOption = {
  id: string;
  num: string;
  isDefault: boolean;
  features: Set<string>;
};

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

/* main */
export const runCrate = async () => {
  possessSearchBar();

  const { categories, crate, keywords, versions } = getData<CrateResponse>("data");

  // install dep graph
  await Promise.all([
    initBarChartSection(crate.id, crate.max_stable_version, versions),
    initFeaturesSection(crate.id, crate.max_stable_version, versions),
    initDependencySection(crate.id, crate.max_stable_version),
    initTrendSection(crate.id, new Map(versions.map((x) => [ x.id, x.num ])))
  ]);
};

/* init sections */
const initBarChartSection = async (id: string, stableVersio: string, versions: CrateResponse["versions"]) => {
  const bundleSizeGraphContainer = d3.select<HTMLElement, null>(".bar-chart-container");
  const viewSwitchContainer = d3.select<HTMLElement, null>(".view-swtiches");

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

  const maxBundleSize = versions.reduce((acc, x) => Math.max(acc, x.crate_size), 0);
  const maxDownloads = versions.reduce((acc, x) => Math.max(acc, x.downloads), 0);
  const maxLifetime = versions.reduce((acc, x) => Math.max(acc, getTimeDiff(new Date().toISOString(), x.created_at)), 0);
  const maxFeatures = versions.reduce((acc, x) => Math.max(acc, Object.keys(x.features).length), 0);

  addButtonEventHandler("#switch-crate-size", "size", maxBundleSize);
  addButtonEventHandler("#switch-dowloads", "downloads", maxDownloads);
  addButtonEventHandler("#switch-lifetime", "lifetime", maxLifetime);
  addButtonEventHandler("#switch-features", "features", maxFeatures);

  let minorChange = semver.coerce(versions[0].num).minor;
  let majorChange = semver.coerce(versions[0].num).major;
  let prevBar: RowBar | null = null;

  const bars = versions.map((versionContent) => {
    const bar = new RowBar(versionContent, id);
    const ver = bar.getSemVer();

    if (versionContent.num === stableVersio) {
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
};

/* structs */
class RowBar {
  private readonly rTrack = d3.create("div");
  private readonly rTrackBar = d3.create("div");
  private readonly label = d3.create("a");
  private readonly barContainer = d3.create("div");
  private readonly bar = d3.create("div");
  private readonly innerBarLabel = d3.create("span");

  private readonly data: CrateResponse["versions"][number];

  public constructor(data: CrateResponse["versions"][number], crateId: string) {
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

const useLoader = async (selector: string, callback: () => Promise<SVGSVGElement | null>) => {
  const displayContainer = d3.select<HTMLElement, null>(selector);
  const toggleContainer = displayContainer.node()?.previousElementSibling;
  const loaderContainer = displayContainer.selectChild();
  const loaderLayout = loaderContainer.selectChild();

  try {
    const el = await callback();

    displayContainer.append(() => el);
    loaderContainer.remove();
    toggleContainer?.removeAttribute("hidden");
  }
  catch (err) {
    loaderLayout.remove();
  
    const a = loaderContainer.append("div")
      .classed("result-msg", true)
      .text("Could not fetch data.");
    const b = loaderContainer.append("div")
      .classed("action-msg", true)
      .text("RETRY")
      .on("click", async () => {
        a.remove();
        b.remove();
        loaderContainer.append(() => loaderLayout.node());

        await useLoader(selector, callback);
      });
  }
};

const initFeaturesSection = async (id: string, stableVersio: string, versions: CrateResponse["versions"]) => {
  const featuresSelect = d3.select(".features-selection").on("change", () => {
    const value = featuresSelect.property("value") as string;

    featuresSection.setVersion(value, versions);
  });

  const featuresSection = new FeaturesSection(id, stableVersio, versions);
};

const initDependencySection = async (id: string, num: string) => {
  await useLoader(".dep-tree-display-container", async () => {
    const depData = await getDepTree(id, num);
    const chartEl = getDepChart(depData);

    return chartEl;
  });
};

const initTrendSection = async (id: string, nummap: Map<number, string>) => {
  await useLoader(".downloads-trend-display-container", async () => {
    const res = await fetch(`https://crates.io/api/v1/crates/${id}/downloads`);
    const data = await res.json() as DownloadsResponse;

    // vmap
    const vmap = new Map<string, { date: Date; downloads: number; }[]>([[
      "Others",
      data.meta.extra_downloads.map((x) => ({ date: new Date(x.date), downloads: x.downloads }))
    ]]);

    data.version_downloads.forEach((d) => {
      const m = vmap.get(`${d.version}`);
      const point = { date: new Date(d.date), downloads: d.downloads };

      m
        ? m.push(point)
        : vmap.set(`${d.version}`, [ point ]);
    });

    // tmap
    /* const tmap = new Map<string, number>(data.meta.extra_downloads.map((x) => [ x.date, x.downloads ]));

    data.version_downloads.forEach((d) => {
      tmap.set(d.date, (tmap.get(d.date) || 0) + d.downloads);
    });

    const tValues = Array.from(tmap).map(([ date, downloads ]) => ({ date: new Date(date), downloads }));
    const tReadyData = { name: "all", values: tValues }; */

    // get ready data
    const readyData = Array.from(vmap).map(([ name, values ]) => ({ name, values }));

    const { svg, handleDisable } = getTrend(readyData);

    // create toggles
    createTrendToggles(Array.from(vmap).map(([ name ]) => name), nummap, handleDisable);

    return svg;
  });
};

const createTrendToggles = (data: string[], nummap: Map<number, string>, handleDisable: (name: string) => void) => {
  const toggleLayout = d3.select(".downloads-trend-toggles");

  const content = toggleLayout
    .selectAll(".toggle-content")
    .data(data)
    .join("div")
    .classed("toggle-content", true);

  const toggleContainer = content
    .join("div")
    .append("div")
    .classed("toggle-container", true)
    .classed("checked", true);
  const textContainer = content
    .join("div")
    .append("div")
    .classed("toggle-text-container", true);

  const toggleLine = toggleContainer
    .append("div")
    .classed("toggle-line", true);
  const toggleButton = toggleContainer.append("div")
    .classed("toggle-button", true)
    .on("click", (e, d1) => {
      const self = toggleContainer.filter((d2) => d1 === d2);
      
      const value = !self.classed("checked");
      self.classed("checked", value);

      handleDisable(d1);
    });

  const name = textContainer.append("div")
    .classed("toggle-label", true)
    .text((d) => d === "Others" ? "Others" : nummap.get(Number(d)) ?? "");
};

class FeaturesSection {
  private readonly layer: d3.Selection<HTMLElement, [string, string[]], HTMLElement, any>;
  private readonly display: d3.Selection<HTMLElement, null, HTMLElement, any>;
  private readonly copyIcon: d3.Selection<HTMLElement, null, HTMLElement, any>;
  private readonly displayOption: DisplayOption;

  constructor(id: string, num: string, versions: CrateResponse["versions"]) {
    this.layer = d3.select<HTMLElement, [ string, string[] ]>(".features-toggles");
    this.display = d3.select<HTMLElement, null>(".features-display-pane");
    this.copyIcon = d3.select<HTMLElement, null>(".copy-icon");
    this.displayOption = {
      id,
      num,
      isDefault: true,
      features: new Set()
    };

    // mount icon click event handler
    this.copyIcon.on("click", async () => {
      this.display.classed("blinked", true);

      setTimeout(() => {
        this.display.classed("blinked", false);
      }, 300);

      await navigator.clipboard.writeText(this.getResultText());
    });
    
    // get data
    const data = this.selectVersion(num, versions);

    this.render(data);
  }

  selectVersion(num: string, versions: CrateResponse["versions"]) {
    const features = versions.find((x) => x.num === num)?.features;

    if (!features) {
      throw new Error();
    }

    return Object.entries(features);
  }

  clear() {
    this.layer.selectAll(".toggle-content")
      .data([], (d) => d[0])
      .join("div")
      .classed("toggle-content", true);
  }

  clearDisplayOption() {
    this.displayOption.isDefault = true;
    this.displayOption.features = new Set();
  }

  setVersion(num: string, versions: CrateResponse["versions"]) {
    const data = this.selectVersion(num, versions);

    this.clearDisplayOption();

    this.displayOption.num = num;

    this.clear();
    this.render(data);
    this.renderResult();
  }

  render(data: [string, string[]][]) {
    const content = this.layer
      .selectAll(".toggle-content")
      .data(data, (d) => d[0])
      .join("div")
      .classed("toggle-content", true);

    const toggleContainer = content
      .join("div")
      .append("div")
      .classed("toggle-container", true)
      .classed("checked", (d) => d[0] === "default");
    const textContainer = content
      .join("div")
      .append("div")
      .classed("toggle-text-container", true);

    const toggleLine = toggleContainer
      .append("div")
      .classed("toggle-line", true);
    const toggleButton = toggleContainer
      .append("div")
      .classed("toggle-button", true)
      .on("click", (e, d1) => {
        const self = toggleContainer.filter((d2) => d1 === d2);
        
        const value = !self.classed("checked");
        self.classed("checked", value);

        if (d1[0] === "default") {
          this.displayOption.isDefault = value;
        }
        else if (value) {
          this.displayOption.features.add(d1[0]);
        }
        else {
          this.displayOption.features.delete(d1[0]);
        }

        this.renderResult();
      });

    const name = textContainer
      .append("div")
      .classed("toggle-label", true)
      .classed("default", (d) => d[0] === "default")
      .classed("multi", (d) => Boolean(d[1]?.length))
      .text((d) => d[0])
      .on("mouseover", (e, d1) => {
        name.filter((d2) => d1[1].includes(d2[0])).classed("highlighted", true);
      })
      .on("mouseleave", (e, d1) => {
        name.filter((d2) => d1[1].includes(d2[0])).classed("highlighted", false);
      });
    const includingList = textContainer
      .append("div")
      .classed("feature-sub", true)
      .append("ul")
      .selectAll("li")
      .data((d) => d[1], (d: any) => d)
      .join("li")
      .text((d) => d);
  }

  getResultText() {
    const {
      id,
      num,
      isDefault,
      features
    } = this.displayOption;

    if (isDefault && !features.size) {
      return `${id} = "${num}"`;
    }
    else {
      const res = [ `version = "${num}"` ];

      if (!isDefault) {
        res.push("default-features = false");
      }
      if (features.size) {
        const featuresString = Array.from(features).map((x) => `"${x}"`).join(", ");
        res.push(`features = [${featuresString}]`);
      }

      return `${id} = { ${res.join(", ")} }`;
    }
  }

  renderResult() {
    const tokenize = (str: string) => {
      const res = str
        .replace(/"(.*?)"/g, (token) => `<span class="string">${token}</span>`)
        .replace(/true|false/g, (token) => `<span class="keyword">${token}</span>`);

      return res;
    };

    const res = this.getResultText();

    this.display.html(tokenize(res));
  }
}
