// Reading Tailwind classes out of a class list.

import { splitOutsideBrackets } from "./split.ts";

export type ClassToken = {
  // The class as written, e.g. `!data-[state=open]:rounded-s-full`.
  raw: string;
  // The utility without variants or `!`, e.g. `rounded-s-full`.
  utility: string;
  // The variants in order, e.g. `["data-[state=open]"]`.
  variants: string[];
};

export function classTokens(text: string): ClassToken[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const parts = splitOutsideBrackets(raw, ":");
      const utility = parts.pop()!.replace(/^!|!$/g, "");
      return { raw, utility, variants: parts };
    });
}
