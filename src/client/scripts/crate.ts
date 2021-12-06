import bytes from "bytes";
import pluralize from "pluralize";
import semver from "semver";

/* utils */
const getData = () => {
  const dataInputEl = document.getElementById("data");
  const data = JSON.parse(dataInputEl["value"]);

  dataInputEl.remove();
  
  return data;
}

const getDay = (milsec: number) => {
  return Math.floor(milsec / (1000 * 60 * 60 * 24));
}

const getTimeDiff = (d1: string, d2: string) => {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();

  return t1 - t2;
}

/* structs */
class BarRowElement {
  private readonly rTrack = document.createElement("div");
  private readonly rTrackBar = document.createElement("div");
  private readonly label = document.createElement("a");
  private readonly barContainer = document.createElement("div");
  private readonly bar = document.createElement("div");
  private readonly innerBarLabel = document.createElement("span");

  private readonly data: CurrentCrate["versions"][number];

  constructor(data: CurrentCrate["versions"][number], crateId: string) {
    this.data = data;

    this.rTrack.classList.add("version-track");
    this.bar.classList.add("bundle-size-bar");

    this.label.textContent = data.num;
    this.label.href = `/crates/${crateId}@${data.num}`

    if (data.yanked) {
      this.rTrack.classList.add("yanked");
      this.label.classList.add("yanked");
    }
    else if (/pre|alpha|beta|rc|dev|insiders/i.test(data.num)) {
      this.rTrack.classList.add("pre");
      this.label.classList.add("pre");
    }

    // append elements
    this.bar.appendChild(this.innerBarLabel);
    this.barContainer.appendChild(this.bar);
    this.rTrack.appendChild(this.rTrackBar);
  }

  getSemVer() {
    return semver.coerce(this.data.num);
  }

  setMinor() {
    this.rTrackBar.classList.remove("majpr");
    this.rTrackBar.classList.add("mark", "minor");
  }

  setMajor() {
    this.rTrackBar.classList.remove("minor");
    this.rTrackBar.classList.add("mark", "major");
  }

  setCurrent() {
    this.bar.classList.add("current");
    this.label.innerHTML = `<b>${this.data.num}</b>`;
  }

  setBarMode(mode: "size" | "downloads" | "lifetime", maxValue: number) {
    switch (mode) {
      case "size": {
        this.bar.style.width = `${this.data.crate_size / maxValue * 100}%`;

        const formattedByteString = bytes(this.data.crate_size, { unit: "B", thousandsSeparator: "," });
        
        this.innerBarLabel.innerHTML = formattedByteString;
        break;
      }
      case "downloads": {
        this.bar.style.width = `${this.data.downloads / maxValue * 100}%`;

        this.innerBarLabel.innerHTML = this.data.downloads.toLocaleString("en");
        break;
      }
      case "lifetime": {
        const currentDate = new Date().toISOString();
        const lifetime = getTimeDiff(currentDate, this.data.created_at);
        const lifetimeDay = getDay(lifetime);

        this.bar.style.width = `${lifetime / maxValue * 100}%`;

        this.innerBarLabel.innerHTML = `${lifetimeDay.toLocaleString("en")} ${pluralize("day", lifetimeDay)}`;
        break;
      }
      default: {
        throw new Error();
      }
    }
  }

  setParent(parent: Element) {
    parent.appendChild(this.rTrack);
    parent.appendChild(this.label);
    parent.appendChild(this.barContainer);
  }
}

/* main */
const runCrate = () => {
  const bundleSizeGraphContainer = document.getElementsByClassName("graph-container")[0];
  const viewSwitchContainer = document.getElementsByClassName("view-swtiches")[0];
  const switchCrateSizeEl = document.getElementById("switch-crate-size");
  const switchDownloadsEl = document.getElementById("switch-dowloads");
  const switchLifetimeEl = document.getElementById("switch-lifetime");
  let bars = [];

  // init switches event handle
  [
    switchCrateSizeEl,
    switchDownloadsEl,
    switchLifetimeEl
  ].forEach((el) => {
    el.addEventListener("click", () => {
      if (el.classList.contains("sel")) {
        return;
      }
  
      Array.from(viewSwitchContainer.getElementsByClassName("sel")).forEach((x) => x.classList.remove("sel"));
  
      el.classList.add("sel");
    });
  });

  switchCrateSizeEl.addEventListener("click", () => {
    bars.forEach((x) => x.setBarMode("size", maxBundleSize));
  });

  switchDownloadsEl.addEventListener("click", () => {
    bars.forEach((x) => x.setBarMode("downloads", maxDownloads));
  });

  switchLifetimeEl.addEventListener("click", () => {
    bars.forEach((x) => x.setBarMode("lifetime", maxLifetime));
  });

  const data = getData() as CurrentCrate;

  const maxBundleSize = data.versions.reduce((acc, x) => Math.max(acc, x.crate_size), 0);
  const maxDownloads = data.versions.reduce((acc, x) => Math.max(acc, x.downloads), 0);
  const maxLifetime = data.versions.reduce((acc, x) => Math.max(acc, getTimeDiff(new Date().toISOString(), x.created_at)), 0);

  let minorChange = semver.coerce(data.versions[0].num).minor;
  let majorChange = semver.coerce(data.versions[0].num).major;
  let prevBar = null;

  bars = data.versions.map((version) => {
    const bar = new BarRowElement(version, data.crate.id);
    const ver = bar.getSemVer();

    if (version.num === data.crate.max_stable_version) {
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

export default runCrate;
