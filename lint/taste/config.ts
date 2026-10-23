// Each taste rule's config, exemptions included. This is the only place an
// exemption lives (lint/taste/RULES.md § Exemptions): a build session never
// edits it, and adding one is a human decision. There is no inline opt-out.

export const config = {
  // Library components that may be fully rounded, by name: in source, the
  // files under `src/<name>/` (lower case, as in `src/amount/Amount.tsx`);
  // rendered, the element a component marks `data-component="<Name>"` and
  // everything inside it.
  "no-pill": { exempt: ["Avatar"] },
} as const;
