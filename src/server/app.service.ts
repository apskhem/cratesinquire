import { Injectable } from "@nestjs/common";
import * as pug from "pug";
import * as fs from "fs";
import * as esbuild from "esbuild";
import * as sass from "sass";
import { join } from "path";

@Injectable()
export class AppService {
  private cachedIndexTemplate: string | null = null;
  private compiledCrateTemplate: pug.compileTemplate | null = null;

  private static PUG_INDEX_PATH = join(__dirname, "..", "src", "client", "templates", "index.pug");
  private static PUG_CRATES_ID_PATH = join(__dirname, "..", "src", "client", "templates", "crate.pug");
  private static TYPESCRIPT_ENTRY_PATH = join(__dirname, "..", "src", "client", "scripts", "index.ts");
  private static TYPESCRIPT_OUTFILE = join(__dirname, "..", "public", "bundle.js");
  private static SASS_ENTRY_PATH = join(__dirname, "..", "src", "client", "scss", "main.scss");
  private static SASS_OUTFILE = join(__dirname, "..", "public", "bundle.css");

  getCompiledIndex(): string {
    if (this.cachedIndexTemplate) {
      return this.cachedIndexTemplate;
    }

    const pugString = fs.readFileSync(AppService.PUG_INDEX_PATH, "utf8");
    const fn = pug.compile(pugString, { filename: AppService.PUG_INDEX_PATH });

    this.cachedIndexTemplate = fn();

    return this.cachedIndexTemplate;
  }

  getCompiledCratesId(id: string, data: Record<string, any>, version?: string): string {
    if (!this.compiledCrateTemplate) {
      const pugString = fs.readFileSync(AppService.PUG_CRATES_ID_PATH, "utf8");
      
      this.compiledCrateTemplate = pug.compile(pugString, { filename: AppService.PUG_CRATES_ID_PATH });
    }

    const res = this.compiledCrateTemplate({ data, raw: JSON.stringify(data) });

    return res;
  }

  /* compile */
  compilePug(entry: string, outfile: string) {
    const pugString = fs.readFileSync(entry, "utf8");
    const fn = pug.compile(pugString, { filename: entry });
  
    fs.writeFileSync(outfile, fn());
  }

  static compileTypeScript() {
    esbuild.buildSync({
      entryPoints: [AppService.TYPESCRIPT_ENTRY_PATH],
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
