import runCrate from "./crate";
import runHome from "./home";
import * as d3 from "d3";

window.onload = () => {
  switch (d3.select("main").attr("id")) {
    case "home": runHome(); break;
    case "crate": void runCrate(); break;
    default: throw new Error();
  }
};
