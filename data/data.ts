import {
  melpaArchiveJson,
  melpaDownloadCountsJson,
  elpaConvertedJson,
} from "./schema.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { $ } from "zx";

/**
 * Fetch ELPA archive-contents from `url`, convert it to JSON, then return the value.
 * The conversion step runs Emacs to do the job.
 * If `cachePath` is provided, try to read from it. Writing to it is not
 * supported yet.
 */
async function getElpaJson(url: string, cachePath?: string) {
  if (cachePath) {
    try {
      return elpaConvertedJson.parse(
        JSON.parse(readFileSync(cachePath, { encoding: "utf-8" }))
      );
    } catch {}
  }
  const stdout = (await $`sh ./elpa-to-json - ${url}`).stdout;
  // We can't use ProcessOutput.json() because that merges stdout and stderr.
  return elpaConvertedJson.parse(JSON.parse(stdout));
}

/**
 * Wrapper for `fetch` on `url`.
 * If `cachePath` is provided, try to read from it; and write to it if it
 * doesn't exist.
 */
async function getJson(url: string, cachePath?: string) {
  if (cachePath) {
    try {
      return JSON.parse(readFileSync(cachePath, { encoding: "utf-8" }));
    } catch {}
  }
  const response = await fetch(url);
  if (cachePath) {
    writeFileSync(cachePath, await response.text());
  }
  return await response.json();
}

// MELPA has 3 files: archive.json, recipes.json, and download_counts.json.
// - archive.json has most of the info we need.
// - recipes.json has the raw recipes, which includes the fetcher name and
//   repository (if applicable) and file paths. The fetching information is
//   already in URL within archive.json, and we don't need the file paths.
// - download_counts.json is as the name says. It is an object of names to numbers.
export const melpaArchive = melpaArchiveJson.parse(
  await getJson("https://melpa.org/archive.json", "melpa-archive.json")
);
export const melpaDownloads = melpaDownloadCountsJson.parse(
  await getJson(
    "https://melpa.org/download_counts.json",
    "melpa-download-counts.json"
  )
);
export const gnu = await getElpaJson(
  "https://elpa.gnu.org/packages/",
  "gnu.json"
);
export const nongnu = await getElpaJson(
  "https://elpa.nongnu.org/nongnu/",
  "nongnu.json"
);
export const org = await getElpaJson("https://orgmode.org/elpa/", "org.json");
export const jcs = await getElpaJson(
  "https://jcs-emacs.github.io/jcs-elpa/packages/",
  "jcs-elpa.json"
);
