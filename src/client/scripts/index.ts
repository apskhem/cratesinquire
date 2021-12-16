import { runCrate } from "./crate";
import { runHome } from "./home";
import * as d3 from "d3";

// redirect if is not https
if (location.protocol !== "https:" && !/localhost/.test(location.hostname)) {
  location.replace(`https://www.cratesinquire.com${location.pathname}`);
}

// detct dark mode
if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
  // dark mode
}

// when everything is loaded, run this script
window.onload = () => {
  switch (d3.select("main").attr("id")) {
    case "home": {
      runHome();
      break;
    }
    case "crate": {
      void runCrate();
      break;
    }
    default: {
      throw new Error();
    }
  }
};
