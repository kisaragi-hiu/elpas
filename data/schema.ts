import { z } from "zod";

const versionList = z.array(z.number());
export type VersionList = z.infer<typeof versionList>;

/**
 * Dependency alist as used by both archive-contents and MELPA's archive.json
 */
const deps = z.record(versionList);
const summary = z.string();
const keywords = z.array(z.string());
const people = z.union([
  z.array(z.string()),
  // Accept name -> email maps but convert them to string arrays
  z.record(z.string(), z.string().nullable()).transform((obj) => {
    let out = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v) {
        out.push(`${k} <${v}>`);
      } else {
        out.push(k);
      }
    }
  }),
]);
const elpaPackageKind = z.enum(["tar", "single"]);

export const elpaConvertedJson = z.record(
  z.union([
    // Tuples cannot have optional elements. This is the workaround.
    // https://github.com/colinhacks/zod/issues/149
    z.tuple([versionList, deps.nullable(), summary, elpaPackageKind]),
    z.tuple([
      versionList,
      deps.nullable(),
      summary,
      elpaPackageKind,
      z.object({
        /** This is the URL written in the main file itself */
        url: z.string().url(),
        keywords: z.optional(keywords),
        maintainer: z.optional(people),
        authors: z.optional(people),
        commit: z.optional(z.string()),
      }),
    ]),
  ]),
);

export const melpaDownloadCountsJson = z.record(z.number().int());

const url = z.union([
  z.literal("not distributed yet"),
  z.literal("none yet"),
  z
    .string()
    // package "nikola" has an erroneous URL with an extra colon.
    // Work around it.
    .transform((val) => {
      if (!val.startsWith(": ")) return val;
      console.log(
        `Warning: "${val}" starts with a colon. Automatically fixing...`,
      );
      return val.slice(2);
    })
    .transform((val) => {
      if (!val.startsWith("htts://")) return val;
      console.log(`Warning: ${val} misspelled https. Automatically fixing...`);
      return "https://" + val.slice(7);
    })
    // A few packages specify URL without protocol, as bare URLs. This
    // would otherwise be fine but Zod's URL validator doesn't accept
    // it, for good reason.
    // Work around it.
    .transform((val) => {
      if (val.startsWith("http")) return val;
      console.log(
        `Warning: ${val} is missing the protocol. Automatically fixing...`,
      );
      return "https://" + val;
    })
    .refine((val) => z.string().url().safeParse(val).success),
]);

const melpaForgeFetcher = z.enum(["github", "gitlab", "codeberg", "sourcehut"]);
const melpaScmFetcher = z.enum(["git", "hg"]);
const melpaFetcher = z.union([melpaForgeFetcher, melpaScmFetcher]);
const melpaRecipe = z.union([
  // there are other fields, see https://github.com/melpa/melpa#recipe-format
  // but I'm not bothering with them.
  z.object({
    // repo is required and url is invalid for forges
    fetcher: melpaForgeFetcher,
    repo: z.string(),
  }),
  z.object({
    // repo is invalid and url is required for direct scm recipes
    fetcher: melpaScmFetcher,
    url: z.string(),
  }),
]);
export const melpaRecipesJson = z.record(melpaRecipe);
type MelpaRecipe = z.infer<typeof melpaRecipe>;

/**
 * Return a URL as a string for a given MELPA recipe.
 */
export function melpaRecipeToUrl(recipe: MelpaRecipe): string {
  if (recipe.fetcher === "github") {
    return `https://github.com/${recipe.repo}`;
  }
  if (recipe.fetcher === "gitlab") {
    return `https://gitlab.com/${recipe.repo}`;
  }
  if (recipe.fetcher === "codeberg") {
    return `https://codeberg.org/${recipe.repo}`;
  }
  if (recipe.fetcher === "sourcehut") {
    // The "~":
    // > Note that user names in Sourcehut URLs are prefixed with ~, that has to
    // > be omitted in the value of this property.
    // Why always Git:
    // > There are no dedicated fetchers for Mercurial.
    // > When a forge supports both Git and Mercurial, then the respective
    // > fetcher can only be used for Git repositories. For Mercurial
    // > repositories always use the hg fetcher.
    return `https://git.sr.ht/~${recipe.repo}`;
  }
  if (recipe.fetcher === "git") {
    return recipe.url;
  }
  if (recipe.fetcher === "hg") {
    return recipe.url;
  }
  // TypeScript doesn't detect we've exhausted all options.
  // The real "solution" is probably switching to ArkType (struggling through
  // its docs) and using its `match`.
  throw new Error("impossible");
}

export const melpaArchiveJson = z.record(
  z.object({
    ver: versionList,
    deps: z.union([z.null(), deps]),
    /** This is actually the summary. */
    desc: z.string(),
    type: elpaPackageKind,
    props: z.object({
      /** The URL written in the main file itself */
      url: z.optional(url),
      commit: z.optional(z.string()),
      revdesc: z.optional(z.string()),
      keywords: z.optional(keywords),
      maintainers: z.optional(people),
      authors: z.optional(people),
    }),
  }),
);

type ElpaConvertedJson = z.infer<typeof elpaConvertedJson>;
type MelpaArchiveJson = z.infer<typeof melpaArchiveJson>;

const pkg = z.object({
  name: z.string(),
  archive: z.string(),
  ver: versionList,
  deps: z.union([z.null(), deps]),
  summary: z.string(),
  downloads: z.optional(z.number().int()),
  maintainers: z.optional(z.array(z.string())),
  authors: z.optional(z.array(z.string())),
  keywords: z.optional(z.array(z.string())),
  commit: z.optional(z.string()),
  /** The URL written in the main file itself */
  url: z.optional(url),
});

export type Pkg = z.infer<typeof pkg>;
export const combined = z.object({
  collectedDate: z.coerce.date(),
  packages: z.array(pkg),
});

/**
 * Return `pkg`'s page on `archive`.
 */
export function archivePkgUrl(archive: string, pkg: string, fallbackPkg?: Pkg) {
  if (archive === "gnu") return `https://elpa.gnu.org/packages/${pkg}.html`;
  if (archive === "nongnu") return `https://elpa.nongnu.org/nongnu/${pkg}.html`;
  // FIXME: remove this
  if (archive === "org")
    return `https://git.sr.ht/~bzg/orgweb/commit/f1ddfc44a1df04ebcb39613cbd459057b486d0cb`;
  if (archive === "jcs-elpa")
    return fallbackPkg
      ? fallbackPkg.url
      : `https://github.com/jcs-emacs/jcs-elpa/blob/master/recipes/${pkg}`;
  if (archive === "melpa") return `https://melpa.org/#/${pkg}`;
  if (archive === "melpa-stable") return `https://stable.melpa.org/#/${pkg}`;
}
