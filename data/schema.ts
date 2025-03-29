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
        url: z.string().url(),
        keywords: z.optional(keywords),
        maintainer: z.optional(people),
        authors: z.optional(people),
        commit: z.optional(z.string()),
      }),
    ]),
  ])
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
        `Warning: "${val}" starts with a colon. Automatically fixing...`
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
        `Warning: ${val} is missing the protocol. Automatically fixing...`
      );
      return "https://" + val;
    })
    .refine((val) => z.string().url().safeParse(val).success),
]);

export const melpaArchiveJson = z.record(
  z.object({
    ver: versionList,
    deps: z.union([z.null(), deps]),
    /** This is actually the summary. */
    desc: z.string(),
    type: elpaPackageKind,
    props: z.object({
      url: z.optional(url),
      commit: z.optional(z.string()),
      revdesc: z.optional(z.string()),
      keywords: z.optional(keywords),
      maintainers: z.optional(people),
      authors: z.optional(people),
    }),
  })
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
  url: z.optional(url),
});

export type Pkg = z.infer<typeof pkg>;
export const pkgs = z.array(pkg);
