// Classes that compile but carry a value no token defines (ADR 0002). The
// closed theme already makes `p-4` and `bg-red-500` unknown classes; these
// get past it, so token lint restricts them by pattern. The TSX rule
// (better-tailwindcss/no-restricted-classes) and the CSS rule's `@apply` check
// share them. The first pattern that matches a class names the finding.

// Any run of variants, `hover:` or `data-[state=open]:`, before the utility.
const variants = String.raw`^(?:[^:]*:)*!?`;

// Utilities whose number is a count, not a measurement.
const counts = [
  "grid-cols",
  "grid-rows",
  "col-span",
  "col-start",
  "col-end",
  "row-span",
  "row-start",
  "row-end",
  "order",
  "line-clamp",
  "columns",
  "flex",
  "grow",
  "shrink",
].join("|");

export const restrictedClasses = [
  {
    // `p-[13px]`, `[color:#f00]`; a bracket followed by `:` is a variant.
    pattern: String.raw`\[([^\[\]]*)\](?!:)`,
    message:
      "Arbitrary value '[$1]' bypasses the token scale. Use a token class.",
  },
  {
    // v4's `p-(--x)`, short for `p-[var(--x)]`.
    pattern: String.raw`-\(([^)]*)\)`,
    message:
      "CSS variable shorthand '($1)' bypasses the token scale. Use a token class.",
  },
  {
    pattern: `${variants}-?opacity-`,
    message:
      "opacity-* is banned (ADR 0002). Disabled and muted states use colour roles.",
  },
  {
    // `bg-accent/50`; a fraction such as `w-1/2` has a digit before the slash.
    pattern: String.raw`[a-z]\/(\d+(?:\.\d+)?)!?$`,
    message:
      "Modifier '/$1' changes a token by a raw amount. Use a token class.",
  },
  {
    // `ring-2`, `-z-10`, `duration-150`, `h-px`. Zero is allowed: `p-0` is a
    // token and `border-0` is no value at all.
    pattern: String.raw`${variants}-?(?!(?:${counts})-)([a-z]+(?:-[a-z]+)*)-((?:[1-9]\d*(?:\.\d+)?|0\.\d+)%?|px)!?$`,
    message: "'$1-$2' is a raw value, not a token. Use a token class.",
  },
];
