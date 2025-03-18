import { z } from "npm:zod";

const versionList = z.array(z.number());

/**
 * Dependency alist as used by both archive-contents and MELPA's archive.json
 */
const deps = z.record(versionList);
const elpaPackageKind = z.enum(["tar", "single"]);

export const melpaArchiveJson = z.record(
  z.object({
    ver: versionList,
    deps: z.union([z.null(), deps]),
    /** This is actually the summary. */
    desc: z.string(),
    type: elpaPackageKind,
    props: z.object({
      url: z.optional(
        z.union([
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
        ])
      ),
      commit: z.string(),
      revdesc: z.optional(z.string()),
      keywords: z.optional(z.array(z.string())),
    }),
  })
);
