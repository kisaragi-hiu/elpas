import combinedRaw from "./combined.json";
import { combined } from "./schema.ts";

const parsed = combined.parse(combinedRaw);

export const collectedDate = parsed.collectedDate;
export const packages = parsed.packages;
export const pkgNameIndex = Object.groupBy(packages, (elem) => elem.name);
