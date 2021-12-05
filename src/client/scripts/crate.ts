import bytes from "bytes";
import { max } from "../../../node_modules/rxjs/dist/types/index";

/* utils */
const getData = () => {
  const dataInputEl = document.getElementById("data");
  const data = JSON.parse(dataInputEl["value"]);

  dataInputEl.remove();
  
  return data;
}

/* main */
const runCrate = () => {
  const bundleSizeGraphContainer = document.getElementsByClassName("bundle-size-graph-container")[0];

  const data = getData() as CurrentCrate;

  const maxBundleSize = Math.max(...data.versions.map((x) => x.crate_size));
  const maxDownload = Math.max(...data.versions.map((x) => x.downloads))

  for (const version of data.versions) {
    const label = document.createElement("div");
    const barContainer = document.createElement("div");
    const bar = document.createElement("div");
    const innerBarLabel = document.createElement("span");

    bar.classList.add("bundle-size-bar");
    bar.style.width = `${version.crate_size / maxBundleSize * 100}%`;

    const formattedByteString = bytes(version.crate_size, { unit: "B", thousandsSeparator: "," });

    label.textContent = version.num;
    innerBarLabel.innerHTML = formattedByteString;

    // for current version
    if (version.num === data.crate.max_stable_version) {
      bar.classList.add("current");
      label.innerHTML = `<b>${version.num}</b>`;
    }

    bar.appendChild(innerBarLabel);
    barContainer.appendChild(bar);
    bundleSizeGraphContainer.appendChild(label);
    bundleSizeGraphContainer.appendChild(barContainer);
  }

  console.log(data, maxBundleSize)
};

export default runCrate;
