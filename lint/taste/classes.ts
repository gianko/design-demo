// Reading Tailwind classes out of a class list.

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
      const parts = splitVariants(raw);
      const utility = parts.pop()!.replace(/^!|!$/g, "");
      return { raw, utility, variants: parts };
    });
}

// `a:b:[&:hover]:c` splits on the colons outside brackets.
function splitVariants(raw: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === "[" || char === "(") depth++;
    else if (char === "]" || char === ")") depth--;
    else if (char === ":" && depth === 0) {
      parts.push(raw.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(raw.slice(start));
  return parts;
}
