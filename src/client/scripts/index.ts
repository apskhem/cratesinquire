import runCrate from "./crate";
import runHome from "./home";

window.onload = () => {
  switch (document.getElementsByTagName("main")[0].id) {
    case "home": runHome(); break;
    case "crate": runCrate(); break;
    default: throw new Error();
  }
};
