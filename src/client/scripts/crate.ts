import bytes from "bytes";
import pluralize from "pluralize";
import semver from "semver";
import { getBaseDepTree, getDevDepTree, getOptionalDepTree } from "./deps";
import { getDepChart } from "./tree";
import * as d3 from "d3";
import { initSearchBar as possessSearchBar } from "./search-bar";
import { getTrend } from "./trend";
import convert from "color-convert";

type BarMode = "size" | "downloads" | "lifetime" | "features";
type A = [ number, number ];

const MAX_COLLAPSABLE_CONTENT = 20;

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

  const num = crate.max_stable_version || crate.max_version;

  initBarChartSection(crate.id, num, versions);
  initFeaturesSection(crate.id, num, versions);

  // install dep graph
  await Promise.all([
    initDependencySection(crate.id, num),
    initTrendSection(crate.id, new Map(versions.map((x) => [ x.id, x.num ])))
  ]);
};

const useLoader = async (selector: string, callback: () => Promise<SVGSVGElement | null>) => {
  const displayContainer = d3.select<HTMLElement, null>(selector);
  const toggleContainer = displayContainer.node()?.parentElement?.getElementsByClassName("flex-items-container") ?? [];
  const loaderContainer = displayContainer.selectChild();
  const loaderLayout = loaderContainer.selectChild();

  try {
    const el = await callback();

    displayContainer.append(() => el);
    loaderContainer.remove();
    Array.from(toggleContainer).forEach((x) => x.removeAttribute("hidden"));
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
  const collapsableContent = d3.select<HTMLElement, null>(".collapsable-content");
  const collapsableLabel = d3.select<HTMLElement, number>(".collapsable-label");

  // set collapsable content
  collapsableLabel
    .data([ versions.length ])
    .text((d) => d > MAX_COLLAPSABLE_CONTENT ? `Expand another ${d - MAX_COLLAPSABLE_CONTENT} ${pluralize("version", d - MAX_COLLAPSABLE_CONTENT)}` : "")
    .on("click", (e, d) => {
      if (d <= MAX_COLLAPSABLE_CONTENT) {
        return;
      }

      if (collapsableContent.node()?.offsetHeight === collapsableContent.node()?.scrollHeight) {
        collapsableContent.style("max-height", "472px");
        collapsableLabel.text((d) => d > MAX_COLLAPSABLE_CONTENT ? `Expand another ${d - MAX_COLLAPSABLE_CONTENT} ${pluralize("version", d - MAX_COLLAPSABLE_CONTENT)}` : "");
      }
      else {
        collapsableContent.style("max-height", `${collapsableContent.node()?.scrollHeight}px`);
        collapsableLabel.text(`Collapse to only ${MAX_COLLAPSABLE_CONTENT} ${pluralize("version", MAX_COLLAPSABLE_CONTENT)}`);
      }
    });

  // add mode event handler
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
    .attr("rel", "noreferrer")
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
  const container = d3.select(".dep-tree-toggles");
  const devBtn = container.select("#dev");
  const optionalBtn = container.select("#optional");

  // mount toggle event listener
  devBtn.select(".toggle-button").on("click", () => {
    const value = !devBtn.classed("checked");
    devBtn.classed("checked", value);

    // getDevDepTree();
  });

  optionalBtn.select(".toggle-button").on("click", () => {
    const value = !optionalBtn.classed("checked");
    optionalBtn.classed("checked", value);

    // getOptionalDepTree();
  });

  await useLoader(".dep-tree-display-container", async () => {
    const depData = await getBaseDepTree(id, num);
    const chartEl = getDepChart(depData);

    return chartEl;
  });
};

const initFeaturesSection = (id: string, stableVersion: string, versions: CrateResponse["versions"]) => {
  const featuresSelect = d3.select<HTMLSelectElement, null>(".features-selection");
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
  featuresSelect.on("change", () => {
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
    const features = versions.find((x) => x.num === num)?.features ?? [];

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
      .join("li");

    const externalIcon = includingList
      .filter((d) => data.every((x) => x[0] !== d))
      .append("i")
      .classed("fas fa-truck-loading", true);
    const devIcon = includingList
      .filter((d) => false)
      .append("i")
      .classed("fas fa-wrench", true);
    const listText = includingList
      .append("span")
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
  const createTrendToggles = (data: string[], nummap: Map<number, string>, highlight: (name: string) => void, unhighlight: (name: string) => void) => {
    const colorLayout = d3.select(".downloads-trend-toggles");

    const colorScheme = [
      "#4393c3",
      "#92c5df",
      "#f4a582",
      "#d6604d",
      "#b2172b",
      "#670020"
    ];
  
    const content = colorLayout
      .selectAll(".color-content")
      .data(data)
      .join("div")
      .classed("color-content", true);
  
    const colorContainer = content
      .join("div")
      .append("div")
      .classed("color-container", true)
      .classed("checked", true)
      .style("background-color", (d, i) => `rgba(${convert.hex.rgb(colorScheme[i] ?? "#eee")}, 0.4)`)
      .style("border-color", (d, i) => `rgba(${convert.hex.rgb(colorScheme[i] ?? "#eee")}, 0.4)`)
      .on("click", (e, d1) => {
        // const self = colorContainer.filter((d2) => d1 === d2);

        // const value = !self.classed("checked");
        // self.classed("checked", value);
  
        // handleDisable(d1);
      })
      .on("mouseover", (e, d1) => {
        highlight(d1);
      })
      .on("mouseleave", (e, d1) => {
        unhighlight(d1);
      });
    const textContainer = content
      .join("div")
      .append("div")
      .classed("color-text-container", true);
  
    const name = textContainer.append("div")
      .classed("color-label", true)
      .text((d) => d === "Others" ? "Others" : nummap.get(Number(d)) ?? "");
  };

  await useLoader(".downloads-trend-display-container", async () => {
    const res = await fetch(`https://crates.io/api/v1/crates/${id}/downloads`);
    const data = await res.json() as DownloadsResponse;

    // set first data row
    const d = data.meta.extra_downloads.reduce((acc, x) => {
      return acc.set(new Date(x.date).getTime(), { Others: x.downloads });
    }, new Map<number, Record<string, number>>());

    // get all version keys
    const dKeys = Array.from(data.version_downloads.reduce((acc, x) => acc.add(`${x.version}`), new Set<string>()));
    const requiredKeys = [ "Others" ].concat(dKeys);

    // fill the row
    d.forEach((val) => {
      dKeys.forEach((x) => {
        val[x] = 0;
      });
    });

    // fill the value
    data.version_downloads.forEach((x) => {
      const t = new Date(x.date).getTime();
      const val = d.get(t);

      if (val) {
        val[`${x.version}`] = x.downloads;
      }
    });

    // flatten the array
    const readyData = Array.from(d).map(([ date, dRow ]) => {
      return { date, ...dRow };
    });

    // render trend graph
    const { svg, highlight, unhighlight } = getTrend(readyData, requiredKeys);

    // create toggles
    createTrendToggles(requiredKeys, nummap, highlight, unhighlight);

    return svg;
  });
};
