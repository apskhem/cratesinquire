import { runCrate } from "./page-crate";
import { runHome } from "./page-home";
import * as d3 from "d3";
import "../scss/main.scss";

// redirect if is not https
if (location.protocol !== "https:" && !/localhost/.test(location.hostname)) {
  location.replace(`https://${location.host}${location.pathname}`);
}

// when everything is loaded, run this script
window.onload = async () => {
  const main = d3.select("main");

  if (main.attr("id") === "home") {
    runHome();
  }
  else if (main.attr("id") === "crate") {
    await runCrate();
  }
  else {
    throw new Error();
  }
};
