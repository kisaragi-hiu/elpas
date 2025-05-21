import combinedRaw from "./combined.json";
import finderKnownKeywordsRaw from "./finder-known-keywords.json";
import {
  combined,
  type Pkg,
  finderKnownKeywords as finderKnownKeywordsSchema,
} from "./schema.ts";

const parsed = combined.parse(combinedRaw);

export const finderKnownKeywords = finderKnownKeywordsSchema.parse(
  finderKnownKeywordsRaw,
);
export const collectedDate = parsed.collectedDate;
export const packages = parsed.packages;
export const pkgNameIndex = Object.groupBy(packages, (elem) => elem.name);

// We cannot use Object.groupBy because a package can have more than one keyword.
export const keywordPkgIndex = (() => {
  const ret: Record<string, Pkg[]> = {};
  for (const pkg of packages) {
    if (!pkg.keywords) continue;
    for (const keyword of pkg.keywords) {
      if (ret[keyword]) {
        ret[keyword].push(pkg);
      } else {
        ret[keyword] = [pkg];
      }
    }
  }
  return ret;
})();

// mapping keywords to package names, deduplicating the same package on
// different archives
export const keywordPkgNameIndex = (() => {
  const entries = Object.entries(keywordPkgIndex);
  const mapped = entries.map((k, v) => [k, [...new Set(v)]]);
  return mapped;
})();

/** Array of [package, dependency] arrays.
 * This says that "package" depends on "dependency".
 */
export const dependencyIndex = (() => {
  const ret: [string, string][] = [];
  for (const pkg of packages) {
    if (!pkg.deps) continue;
    for (const dep of Object.keys(pkg.deps)) {
      ret.push([pkg.name, dep]);
    }
  }
  return ret;
})();
