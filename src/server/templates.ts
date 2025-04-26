import * as path from "path";
import * as pug from "pug";

export const NOT_FOUND_PAGE = pug.compileFile(
  path.join(__dirname, "./templates/404.pug")
);
export const INDEX_PAGE = pug.compileFile(
  path.join(__dirname, "./templates/index.pug")
);
export const CRATE_PAGE = pug.compileFile(
  path.join(__dirname, "./templates/crate.pug")
);
