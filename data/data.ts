import combinedRaw from "./combined.json";
import { combined, type Pkg } from "./schema.ts";

const parsed = combined.parse(combinedRaw);

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
