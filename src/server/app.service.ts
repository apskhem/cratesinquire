import { Injectable } from "@nestjs/common";
import * as pug from "pug";
import * as fs from "fs";
import * as esbuild from "esbuild";
import * as sass from "sass";
import { join } from "path";
import fetch from "node-fetch";

const PUG_INDEX_PATH = join(__dirname, "..", "src", "client", "templates", "index.pug");
const PUG_CRATES_ID_PATH = join(__dirname, "..", "src", "client", "templates", "crate.pug");
const PUG_404_PATH = join(__dirname, "..", "src", "client", "templates", "404.pug");
const TYPESCRIPT_INDEX_PATH = join(__dirname, "..", "src", "client", "scripts", "index.ts");
const TYPESCRIPT_OUT_PATH = join(__dirname, "..", "public", "bundle.js");
const SASS_INDEX_PATH = join(__dirname, "..", "src", "client", "scss", "index.scss");
const SASS_OUT_PATH = join(__dirname, "..", "public", "bundle.css");

@Injectable()
export class AppService {
  private readonly staticSiteCache = new Map<string, string>();
  private readonly compiledServerSideGeneration = new Map<string, pug.compileTemplate>();
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

  renderIndex(): string {
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

  renderCrate(data: CrateResponse): string {
    const ssg = this.compiledServerSideGeneration.has("crate");
    if (!ssg || !this.isProductionMode) {
      const pugString = fs.readFileSync(PUG_CRATES_ID_PATH, "utf8");
      const temp = pug.compile(pugString, { filename: PUG_CRATES_ID_PATH });

      this.compiledServerSideGeneration.set("crate", temp);
    }

    const res = this.compiledServerSideGeneration.get("crate")?.({ data });

    if (!res) {
      throw new Error();
    }

    return res;
  }

  renderNotFound(title: string, msg: string, status: number): string {
    if (!this.compiledServerSideGeneration.has("404") || !this.isProductionMode) {
      const pugString = fs.readFileSync(PUG_404_PATH, "utf8");
      const temp = pug.compile(pugString, { filename: PUG_404_PATH });

      this.compiledServerSideGeneration.set("404", temp);
    }

    const res = this.compiledServerSideGeneration.get("404")?.({ title, msg, status });

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
    const res = await new Promise<sass.Result>((resolve, reject) => {
      sass.render({
        file: SASS_INDEX_PATH,
        outFile: SASS_OUT_PATH,
        outputStyle: "compressed",
        sourceMap: true
      },
      (err, res) => err ? reject(err) : resolve(res));
    });

    fs.writeFileSync(SASS_OUT_PATH, res.css);
  
    if (res.map) {
      fs.writeFileSync(`${SASS_OUT_PATH}.map`, res.map);
    }
  }
}
