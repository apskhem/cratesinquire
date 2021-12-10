import { Injectable } from "@nestjs/common";
import * as pug from "pug";
import * as fs from "fs";
import * as esbuild from "esbuild";
import * as sass from "sass";
import { join } from "path";

@Injectable()
export class AppService {
  private readonly staticSiteCache = new Map<string, string>();
  private readonly compiledServerSideGeneration = new Map<string, pug.compileTemplate>();

  private static PUG_INDEX_PATH = join(__dirname, "..", "src", "client", "templates", "index.pug");
  private static PUG_CRATES_ID_PATH = join(__dirname, "..", "src", "client", "templates", "crate.pug");
  private static PUG_404_PATH = join(__dirname, "..", "src", "client", "templates", "404.pug");
  private static TYPESCRIPT_ENTRY_PATH = join(__dirname, "..", "src", "client", "scripts", "index.ts");
  private static TYPESCRIPT_OUTFILE = join(__dirname, "..", "public", "bundle.js");
  private static SASS_ENTRY_PATH = join(__dirname, "..", "src", "client", "scss", "main.scss");
  private static SASS_OUTFILE = join(__dirname, "..", "public", "bundle.css");

  renderIndex(): string {
    if (this.staticSiteCache.has("index")) {
      this.staticSiteCache.get("index");
    }

    const pugString = fs.readFileSync(AppService.PUG_INDEX_PATH, "utf8");
    const fn = pug.compile(pugString, { filename: AppService.PUG_INDEX_PATH });

    const temp = fn();

    this.staticSiteCache.set("index", temp);

    return fn();
  }

  renderCrate(data: CrateResponse): string {
    if (!this.compiledServerSideGeneration.has("crate")) {
      const pugString = fs.readFileSync(AppService.PUG_CRATES_ID_PATH, "utf8");
      const temp = pug.compile(pugString, { filename: AppService.PUG_CRATES_ID_PATH });

      this.compiledServerSideGeneration.set("crate", temp);
    }

    const res = this.compiledServerSideGeneration.get("crate")?.({ data });

    if (!res) {
      throw new Error("res is undefined");
    }

    return res;
  }

  renderNotFound(title: string, msg: string, status: number): string {
    if (!this.compiledServerSideGeneration.has("404")) {
      const pugString = fs.readFileSync(AppService.PUG_404_PATH, "utf8");
      const temp = pug.compile(pugString, { filename: AppService.PUG_404_PATH });

      this.compiledServerSideGeneration.set("404", temp);
    }

    const res = this.compiledServerSideGeneration.get("404")?.({ title, msg, status });

    if (!res) {
      throw new Error("res is undefined");
    }

    return res;
  }

  static compileTypeScript() {
    esbuild.buildSync({
      entryPoints: [ AppService.TYPESCRIPT_ENTRY_PATH ],
      bundle: true,
      minify: true,
      sourcemap: true,
      outfile: AppService.TYPESCRIPT_OUTFILE,
      platform: "browser"
    });
  }

  static compileSass() {
    const res = sass.renderSync({
      file: AppService.SASS_ENTRY_PATH,
      outFile: AppService.SASS_OUTFILE,
      outputStyle: "compressed",
      sourceMap: true
    });
  
    // const postcssResult = await postcss([ autoprefixer() ]).process().async();
  
    fs.writeFileSync(AppService.SASS_OUTFILE, res.css);

    if (res.map) {
      fs.writeFileSync(`${AppService.SASS_OUTFILE}.map`, res.map);
    }
  }
}
