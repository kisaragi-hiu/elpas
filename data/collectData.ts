import {
  melpaArchiveJson,
  melpaDownloadCountsJson,
  elpaConvertedJson,
  melpaRecipesJson,
  melpaRecipeToUrl,
} from "./schema.ts";
import type { Pkg } from "./schema.ts";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { $ } from "zx";

/**
 * Fetch ELPA archive-contents from `url`, convert it to JSON, then return the value.
 * The conversion step runs Emacs to do the job.
 * If `cacheName` is provided, try to read from it. Writing to it is not
 * supported yet.
 */
async function getElpaJson(url: string, cacheName?: string) {
  if (cacheName) {
    try {
      return elpaConvertedJson.parse(
        JSON.parse(readFileSync(`cache/${cacheName}`, { encoding: "utf-8" })),
      );
    } catch {}
  }
  const stdout = (await $`sh ./elpa-to-json - ${url}`).stdout;
  // We can't use ProcessOutput.json() because that merges stdout and stderr.
  return elpaConvertedJson.parse(JSON.parse(stdout));
}

/**
 * Wrapper for `fetch` on `url`.
 * If `cacheName` is provided, try to read from it; and write to it if it
 * doesn't exist.
 */
async function getJson(url: string, cacheName?: string) {
  if (cacheName) {
    try {
      return JSON.parse(
        readFileSync(`cache/${cacheName}`, { encoding: "utf-8" }),
      );
    } catch {}
  }
  const response = await fetch(url);
  const text = await response.text();
  if (cacheName) {
    mkdirSync("cache", { recursive: true });
    writeFileSync(`cache/${cacheName}`, text);
  }
  return JSON.parse(text);
}

const melpas = {
  melpa: {
    // MELPA has 3 files: archive.json, recipes.json, and download_counts.json.
    // - archive.json has most of the info we need.
    // - recipes.json has the raw recipes, which includes the fetcher name and
    //   repository (if applicable) and file paths. The fetching information is
    //   already in URL within archive.json, and we don't need the file paths.
    // - download_counts.json is as the name says. It is an object of names to numbers.
    archive: melpaArchiveJson.parse(
      await getJson("https://melpa.org/archive.json", "melpa-archive.json"),
    ),
    recipes: melpaRecipesJson.parse(
      await getJson("https://melpa.org/recipes.json", "melpa-recipes.json"),
    ),
    downloads: melpaDownloadCountsJson.parse(
      await getJson(
        "https://melpa.org/download_counts.json",
        "melpa-download-counts.json",
      ),
    ),
  },
  "melpa-stable": {
    // MELPA has 3 files: archive.json, recipes.json, and download_counts.json.
    // - archive.json has most of the info we need.
    // - recipes.json has the raw recipes, which includes the fetcher name and
    //   repository (if applicable) and file paths. The fetching information is
    //   already in URL within archive.json, and we don't need the file paths.
    // - download_counts.json is as the name says. It is an object of names to numbers.
    archive: melpaArchiveJson.parse(
      await getJson(
        "https://stable.melpa.org/archive.json",
        "melpa-stable-archive.json",
      ),
    ),
    recipes: melpaRecipesJson.parse(
      await getJson(
        "https://stable.melpa.org/recipes.json",
        "melpa-recipes.json",
      ),
    ),
    downloads: melpaDownloadCountsJson.parse(
      await getJson(
        "https://stable.melpa.org/download_counts.json",
        "melpa-stable-download-counts.json",
      ),
    ),
  },
};

const elpas = {
  gnu: await getElpaJson("https://elpa.gnu.org/packages/", "gnu.json"),
  nongnu: await getElpaJson("https://elpa.nongnu.org/nongnu/", "nongnu.json"),
  "jcs-elpa": await getElpaJson(
    "https://jcs-emacs.github.io/jcs-elpa/packages/",
    "jcs-elpa.json",
  ),
};

const packages: Pkg[] = [];

for (const [archiveName, pkgs] of Object.entries(elpas)) {
  for (const [pkgName, [version, deps, desc, _kind, props]] of Object.entries(
    pkgs,
  )) {
    const newPkg: Pkg = {
      name: pkgName,
      archive: archiveName,
      ver: version,
      deps: deps,
      summary: desc,
    };
    // Not misspell, the input is always singular while we want output to be plural
    if (props?.maintainer) newPkg.maintainers = props.maintainer;
    if (props?.authors) newPkg.authors = props.authors;
    if (props?.keywords) newPkg.keywords = props.keywords;
    if (props?.commit) newPkg.commit = props.commit;
    if (props?.url) newPkg.url = props.url;

    packages.push(newPkg);
  }
}

for (const [archiveName, { archive, downloads, recipes }] of Object.entries(
  melpas,
)) {
  for (const [pkgName, { ver, deps, desc, props }] of Object.entries(archive)) {
    const newPkg: Pkg = {
      name: pkgName,
      archive: archiveName,
      ver: ver,
      deps: deps,
      summary: desc,
    };
    if (downloads[pkgName]) {
      newPkg.downloads = downloads[pkgName];
    }
    if (props.maintainers) newPkg.maintainers = props.maintainers;
    if (props.authors) newPkg.authors = props.authors;
    if (props.keywords) newPkg.keywords = props.keywords;
    if (props.commit) newPkg.commit = props.commit;
    // throwing away revdesc

    const recipe = recipes[pkgName];
    if (recipe) {
      const recipeUrl = melpaRecipeToUrl(recipe);
      newPkg.url = recipeUrl;
    } else if (props.url) {
      // fall back to the URL the package itself declares
      console.log(
        `${pkgName} has no URL in its recipe, somehow. Falling back to ${props.url}`,
      );
      newPkg.url = props.url;
    }

    packages.push(newPkg);
  }
}

writeFileSync(
  "combined.json",
  JSON.stringify({ collectedDate: new Date(), packages: packages }, null, 1),
);
