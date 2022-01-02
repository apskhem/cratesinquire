import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as esbuild from "esbuild";
import * as sass from "sass";
import { join } from "path";
import fetch from "node-fetch";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import NodeCache from "node-cache";

const TYPESCRIPT_INDEX_PATH = join(__dirname, "..", "src", "client", "scripts", "index.ts");
const TYPESCRIPT_OUT_PATH = join(__dirname, "..", "public", "bundle.js");
const SASS_INDEX_PATH = join(__dirname, "..", "src", "client", "scss", "main.scss");
const SASS_OUT_PATH = join(__dirname, "..", "public", "bundle.css");

@Injectable()
export class AppService {
  private readonly crateCache = new NodeCache({ stdTTL: 600, checkperiod: 600 });
  public readonly isProductionMode = process.env["NODE_ENV"] === "production";

  async fetchCrate(id: string) {
    const raw = await fetch(`https://crates.io/api/v1/crates/${id}`);
    const data = await raw.json() as CrateResponse;

    return data;
  }

  async fetchCache(id: string) {
    const cachedCrate = this.crateCache.get<CrateResponse>(id);

    if (cachedCrate) {
      return cachedCrate;
    }
    
    const data = await this.fetchCrate(id);
    this.crateCache.set(id, data);

    return data;
  }

  async compilePreprocess() {
    await Promise.all([
      AppService.bundleTypeScript(),
      AppService.bundleSass()
    ]);
  }

  static async bundleTypeScript() {
    await esbuild.build({
      entryPoints: [ TYPESCRIPT_INDEX_PATH ],
      bundle: true,
      minify: true,
      sourcemap: true,
      outfile: TYPESCRIPT_OUT_PATH,
      platform: "browser"
    });
  }

  static async bundleSass() {
    const sassResult = sass.renderSync({
      file: SASS_INDEX_PATH,
      outFile: SASS_OUT_PATH,
      outputStyle: "compressed",
      sourceMap: true
    });

    const postcssResult = await postcss([ autoprefixer ]).process(sassResult.css, {
      from: SASS_INDEX_PATH,
      to: SASS_OUT_PATH,
      map: {
        prev: sassResult.map?.toString()
      }
    });

    fs.writeFileSync(SASS_OUT_PATH, postcssResult.css);
  
    if (postcssResult.map) {
      fs.writeFileSync(`${SASS_OUT_PATH}.map`, postcssResult.map.toString());
    }
  }
}
