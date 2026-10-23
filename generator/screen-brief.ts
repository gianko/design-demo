// A screen brief: a markdown file whose frontmatter holds its audience and
// pass criteria (ADR 0008), and whose body is the plain-language request.

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const frontmatter = z.object({
  audience: z.enum(["admin", "contractor"]),
  requires: z.object({
    components: z.array(z.string()),
    states: z.array(z.string()).default([]),
    actions: z.array(z.string()).default([]),
  }),
});

export type ScreenBrief = z.infer<typeof frontmatter> & {
  slug: string;
  // The whole file, frontmatter included, as the model sees it.
  text: string;
};

export function readScreenBrief(path: string): ScreenBrief {
  const text = readFileSync(path, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) throw new Error(`${path}: no frontmatter`);
  const result = frontmatter.safeParse(parse(match[1]!));
  if (!result.success) {
    throw new Error(`${path}: ${z.prettifyError(result.error)}`);
  }
  return { ...result.data, slug: basename(path, ".md"), text };
}
