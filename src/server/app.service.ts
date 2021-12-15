import { Injectable } from "@nestjs/common";
import * as pug from "pug";
import * as fs from "fs";
import * as esbuild from "esbuild";
import * as sass from "sass";
import { join } from "path";
import fetch from "node-fetch";
import postcss from "postcss";
import autoprefixer from "autoprefixer";

export const PUG_INDEX_PATH = join(__dirname, "..", "src", "client", "templates", "index.pug");
export const PUG_CRATES_ID_PATH = join(__dirname, "..", "src", "client", "templates", "crate.pug");
export const PUG_404_PATH = join(__dirname, "..", "src", "client", "templates", "404.pug");
export const TYPESCRIPT_INDEX_PATH = join(__dirname, "..", "src", "client", "scripts", "index.ts");
export const TYPESCRIPT_OUT_PATH = join(__dirname, "..", "public", "bundle.js");
export const SASS_INDEX_PATH = join(__dirname, "..", "src", "client", "scss", "index.scss");
export const SASS_OUT_PATH = join(__dirname, "..", "public", "bundle.css");

@Injectable()
export class AppService {
  private readonly staticSiteCache = new Map<string, string>();
  private readonly compiledStaticSite = new Map<string, pug.compileTemplate>();
  private readonly reqCrateCache = new Map<string, CrateResponse>();

  public isProductionMode = Boolean(process.env["PRODUCTION"]);

  async fetchCrate(id: string) {
    const raw = await fetch(`https://crates.io/api/v1/crates/${id}`);
    const data = await raw.json() as CrateResponse;

    return data;
  }

  async fetchCache(id: string) {
    if (this.isProductionMode) {
      return await this.fetchCrate(id);
    }

    const reqUrl = `https://crates.io/api/v1/crates/${id}`;
    const cache = this.reqCrateCache.get(reqUrl);

    if (cache) {
      return cache;
    }

    const data = await this.fetchCrate(id);
    this.reqCrateCache.set(reqUrl, data);

    return data;
  }

  generateIndex(): string {
    const cache = this.staticSiteCache.get("index");
    if (cache && this.isProductionMode) {
      return cache;
    }

    const pugString = fs.readFileSync(PUG_INDEX_PATH, "utf8");
    const fn = pug.compile(pugString, { filename: PUG_INDEX_PATH });

    const temp = fn();

    this.staticSiteCache.set("index", temp);

    return fn();
  }

  generateStaticSite<T>(key: string, path: string, data: T) {
    if (!this.compiledStaticSite.has(key) || !this.isProductionMode) {
      const pugString = fs.readFileSync(path, "utf8");
      const temp = pug.compile(pugString, { filename: path });

      this.compiledStaticSite.set(key, temp);
    }

    const res = this.compiledStaticSite.get(key)?.(data);

    if (!res) {
      throw new Error();
    }

    return res;
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
