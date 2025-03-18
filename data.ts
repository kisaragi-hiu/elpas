import { melpaArchiveJson } from "./schema.ts";

async function getJson(url: string) {
  const response = await fetch(url);
  return await response.json();
}

export const melpaArchive = melpaArchiveJson.parse(
  await getJson("https://melpa.org/archive.json")
);
