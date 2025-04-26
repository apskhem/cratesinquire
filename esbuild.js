const fs = require("fs");

const esbuild = require("esbuild");
const sass = require('sass');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');

// setup
fs.existsSync("dist") && fs.rmSync("dist", { recursive: true, force: true })
fs.mkdirSync("dist");

// copy static
fs.cpSync("public", "dist/public", { recursive: true })

// copy templates
fs.cpSync("src/client/templates", "dist/templates", { recursive: true })

// copy webfonts
fs.cpSync("node_modules/@fortawesome/fontawesome-free/webfonts", "dist/public/webfonts", { recursive: true })

// copy rustsec
if (fs.existsSync("src/rustsec/data")) {
  fs.cpSync("src/rustsec/data", "dist/rustsec", { recursive: true })
}

// client - ts
esbuild.buildSync({
  entryPoints: ["src/client/scripts/main.ts"],
  bundle: true,
  sourcemap: true,
  minify: true,
  platform: "browser",
  outfile: "dist/public/bundle.js"
});

// client - scss
const result = sass.compile("src/client/scss/main.scss", {
  loadPaths: [ "node_modules" ],
  sourceMap: true,
  sourceMapIncludeSources: true
});

postcss([autoprefixer])
  .process(result.css, {
    from: 'src/client/scss/main.scss',
    to: 'public/bundle.css',
    map: {
      inline: false,
      prev: result.sourceMap,
    },
  })
  .then((prefixed) => {
    fs.writeFileSync("dist/public/bundle.css", prefixed.css)
    fs.writeFileSync("dist/public/bundle.css.map", prefixed.map.toString())
  })
  .catch((error) => console.error('Error processing CSS:', error));

// server
esbuild.buildSync({
  entryPoints: ["src/server/main.ts"],
  bundle: true,
  sourcemap: true,
  minifyWhitespace: true,
  minifySyntax: true,
  platform: "node",
  packages: "external",
  outfile: "dist/main.js"
});
