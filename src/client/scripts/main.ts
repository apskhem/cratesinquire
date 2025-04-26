import { runCrate } from "./page-crate";
import { runHome } from "./page-home";
import * as d3 from "d3";

// when everything is loaded, run this script
window.onload = async () => {
  const main = d3.select("main");

  if (main.attr("id") === "home") {
    runHome();
  } else if (main.attr("id") === "crate") {
    await runCrate();
  } else {
    throw new Error();
  }
};
