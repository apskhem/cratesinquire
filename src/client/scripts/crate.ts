import bytes from "bytes";
import pluralize from "pluralize";
import semver from "semver";
import { getDepTree } from "./deps";
import { getDepChart } from "./tree";
import * as d3 from "d3";
import { initSearchBar as possessSearchBar } from "./search-bar";
import { getTrend } from "./trend";

type BarMode = "size" | "downloads" | "lifetime" | "features";

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

  initBarChartSection(crate.id, crate.max_stable_version, versions);
  initFeaturesSection(crate.id, crate.max_stable_version, versions);

  // install dep graph
  await Promise.all([
    initDependencySection(crate.id, crate.max_stable_version),
    initTrendSection(crate.id, new Map(versions.map((x) => [ x.id, x.num ])))
  ]);
};

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
    console.log(err);

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

/* init sections */
const initBarChartSection = (id: string, stableVersio: string, versions: CrateResponse["versions"]) => {
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

      setBarMode(mode, maxValue);
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

  const setBarMode = (mode: BarMode, maxValue: number) => {
    switch (mode) {
      case "size": {
        bar.style("width", (d) => maxValue ? `${d.crate_size / maxValue * 100}%` : "0");
        barText.text((d) => d.crate_size ? bytes(d.crate_size, { unit: "B", thousandsSeparator: "," }) : "N/A");
        break;
      }
      case "downloads": {
        bar.style("width", (d) => maxValue ? `${d.downloads / maxValue * 100}%` : "0");
        barText.text((d) => d.downloads.toLocaleString("en"));
        break;
      }
      case "lifetime": {
        const currentDate = new Date().toISOString();

        bar.style("width", (d) => {
          const lifetime = getTimeDiff(currentDate, d.created_at);
          return `${lifetime / maxValue * 100}%`;
        });
        barText.text((d) => {
          const lifetime = getTimeDiff(currentDate, d.created_at);
          const lifetimeDay = getDay(lifetime);
          return `${lifetimeDay.toLocaleString("en")} ${pluralize("day", lifetimeDay)}`;
        });
        break;
      }
      case "features": {
        bar.style("width", (d) => {
          const featureCount = Object.keys(d.features).length;
          return maxValue ? `${featureCount / maxValue * 100}%` : "0";
        });
        barText.text((d) => {
          const featureCount = Object.keys(d.features).length;
          return `${featureCount.toLocaleString("en")} ${pluralize("features", featureCount)}`;
        });
        break;
      }
      default: {
        throw new Error();
      }
    }
  };

  // append row elements
  const row = bundleSizeGraphContainer
    .selectAll(".bar-row")
    .data(versions)
    .join("div")
    .classed("bar-row", true)
    .classed("current", (d) => d.num === stableVersio)
    .classed("yanked", (d) => d.yanked)
    .classed("pre", (d) => /pre|alpha|beta|rc|dev|insiders/i.test(d.num));

  row.append("div")
    .classed("version-track", true)
    .append("div")
    .classed("minor", (d, i) => {
      const prev = versions[i + 1];

      return prev ? semver.diff(prev.num, d.num) === "minor" : false;
    })
    .classed("major", (d, i) => {
      const prev = versions[i + 1];

      return prev ? semver.diff(prev.num, d.num) === "major" : false;
    });

  row.append("a")
    .text((d) => d.num)
    .attr("href", (d) => `https://crates.io/crates/${id}/${d.num}`)
    .attr("target", "_blank");

  const bar = row.append("div")
    .append("div")
    .classed("bar-content", true);

  const barText = bar.append("span");

  // init max width
  setBarMode("size", maxBundleSize);
};

const initDependencySection = async (id: string, num: string) => {
  await useLoader(".dep-tree-display-container", async () => {
    const depData = await getDepTree(id, num);
    const chartEl = getDepChart(depData);

    return chartEl;
  });
};

const initFeaturesSection = (id: string, stableVersion: string, versions: CrateResponse["versions"]) => {
  const layer = d3.select<HTMLElement, [ string, string[] ]>(".features-toggles");
  const display = d3.select<HTMLElement, null>(".features-display-pane");
  const copyIcon = d3.select<HTMLElement, null>(".copy-icon");
  const displayOption = {
    id,
    num: stableVersion,
    isDefault: true,
    features: new Set<string>()
  };

  // mount event handler
  const featuresSelect = d3.select(".features-selection").on("change", () => {
    const value = featuresSelect.property("value") as string;

    setVersion(value, versions);
  });

  copyIcon.on("click", async () => {
    display.classed("blinked", true);

    setTimeout(() => {
      display.classed("blinked", false);
    }, 300);

    await navigator.clipboard.writeText(getResultText());
  });

  // member functions
  const selectVersion = (num: string, versions: CrateResponse["versions"]) => {
    const features = versions.find((x) => x.num === num)?.features;

    if (!features) {
      throw new Error();
    }

    return Object.entries(features);
  };

  const clear = () => {
    layer.selectAll<HTMLElement, [string, string[]]>(".toggle-content")
      .data([], (d) => d[0])
      .join("div")
      .classed("toggle-content", true);
  };

  const clearDisplayOption = () => {
    displayOption.isDefault = true;
    displayOption.features = new Set();
  };

  const setVersion = (num: string, versions: CrateResponse["versions"]) => {
    const data = selectVersion(num, versions);

    clearDisplayOption();

    displayOption.num = num;

    clear();
    render(data);
    renderResult();
  };

  const render = (data: [string, string[]][]) => {
    const content = layer
      .selectAll<HTMLElement, [string, string[]]>(".toggle-content")
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
          displayOption.isDefault = value;
        }
        else if (value) {
          displayOption.features.add(d1[0]);
        }
        else {
          displayOption.features.delete(d1[0]);
        }

        renderResult();
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
      .selectAll<HTMLLIElement, string>("li")
      .data((d) => d[1], (d) => d)
      .join("li")
      .text((d) => d);
  };

  const getResultText = () => {
    const {
      id,
      num,
      isDefault,
      features
    } = displayOption;

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
  };

  const renderResult = () => {
    const tokenize = (str: string) => {
      const res = str
        .replace(/"(.*?)"/g, (token) => `<span class="string">${token}</span>`)
        .replace(/true|false/g, (token) => `<span class="keyword">${token}</span>`);

      return res;
    };

    const res = getResultText();

    display.html(tokenize(res));
  };

  // init
  (() => {
    // get data
    const data = selectVersion(stableVersion, versions);

    render(data);
  })();
};

const initTrendSection = async (id: string, nummap: Map<number, string>) => {
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
