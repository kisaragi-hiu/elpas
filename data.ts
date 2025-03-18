import { melpaArchiveJson, melpaDownloadCountsJson } from "./schema.ts";

async function getJson(url: string) {
  const response = await fetch(url);
  return await response.json();
}

// MELPA has 3 files: archive.json, recipes.json, and download_counts.json.
// - archive.json has most of the info we need.
// - recipes.json has the raw recipes, which includes the fetcher name and
//   repository (if applicable) and file paths. The fetching information is
//   already in URL within archive.json, and we don't need the file paths.
// - download_counts.json is as the name says. It is an object of names to numbers.
export const melpaArchive = melpaArchiveJson.parse(
  await getJson("https://melpa.org/archive.json")
);
export const melpaDownloads = melpaDownloadCountsJson.parse(
  await getJson("https://melpa.org/download_counts.json")
);
