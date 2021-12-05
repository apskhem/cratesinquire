import { Injectable } from "@nestjs/common";
import * as pug from "pug";
import * as fs from "fs";
import * as esbuild from "esbuild";
import * as sass from "sass";
import { join } from "path";

@Injectable()
export class AppService {
  private cachedIndex: string | null = null;

  private static PUG_PATH = join(__dirname, "..", "src", "client", "templates", "index.pug");

  getCompiledIndex(): string {
    if (this.cachedIndex) {
      return this.cachedIndex;
    }

    const pugString = fs.readFileSync(AppService.PUG_PATH, "utf8");
    const fn = pug.compile(pugString, { filename: AppService.PUG_PATH });

    this.cachedIndex = fn();

    return this.cachedIndex;
  }

  /* compile */
  compilePug(entry: string, outfile: string) {
    const pugString = fs.readFileSync(entry, "utf8");
    const fn = pug.compile(pugString, { filename: entry });
  
    fs.writeFileSync(outfile, fn());
  }

  compileTypeScript(entry: string, outfile: string) {
    esbuild.buildSync({
      entryPoints: [entry],
      bundle: true,
      minify: true,
      sourcemap: true,
      outfile,
      platform: "browser"
    });
  }

  compileSass(entry: string, outfile: string) {
    const res = sass.renderSync({
      file: entry,
      outFile: outfile,
      outputStyle: "compressed",
      sourceMap: true
    });
  
    // const postcssResult = await postcss([ autoprefixer() ]).process().async();
  
    fs.writeFileSync(outfile, res.css);
  }
}
