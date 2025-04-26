const fs = require("fs");
const path = require("path");
const toml = require("@iarna/toml");

const READ_DIR = "tmp";
const OUT_DIR = "src/rustsec/data";

function readDirectoriesRecursively(dirPath) {
  const dirList = fs.readdirSync(dirPath);

  const rustSecList = [];
  for (const dir of dirList) {
    const files = fs.readdirSync(path.join(dirPath, dir));

    for (const file of files) {
      const content = fs.readFileSync(path.join(dirPath, dir, file), "utf-8");
      const data = extractMarkdown(content);
      rustSecList.push(data);
    }

    fs.writeFileSync(path.join(OUT_DIR, `${dir}.json`), JSON.stringify(rustSecList, null, 2));
    rustSecList.splice(0, rustSecList.length);

    console.log(`${path.join(dirPath, dir)}: ${dir} - ${files}`);
  }
}

function extractMarkdown(data) {
  // Extract the TOML section within the markdown file
  const tomlSectionMatch = data.match(/```toml\n([\s\S]*?)\n```/);
  if (!tomlSectionMatch) {
    throw new Error('TOML section not found in markdown file');
  }
  const tomlSection = tomlSectionMatch[1];

  let advisory;
  try {
    advisory = toml.parse(tomlSection);
  } catch (error) {
    console.log(tomlSection)
    console.log(error)
  }

  // Extract description and details from the Markdown content
  const descriptionMatch = data.match(/# (.+)/);
  const detailsMatch = data.match(/# .+\n\n([\s\S]*)/);

  return {
    id: advisory.advisory.id,
    package: advisory.advisory.package,
    aliases: advisory.advisory.aliases,
    cvss: advisory.advisory.cvss,
    categories: advisory.advisory.categories,
    date: advisory.advisory.date,
    url: advisory.advisory.url,
    patched_versions: advisory.versions.patched,
    description: descriptionMatch ? descriptionMatch[1].trim() : '',
    details: detailsMatch ? detailsMatch[1].trim() : ''
  };
}

readDirectoriesRecursively(path.join(READ_DIR, "crates"));