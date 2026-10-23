// Inline opt-outs of taste rules (lint/taste/RULES.md § Exemptions), each an
// error: on the next line, on its own line, as a block, and with no rule
// named at all, which silences taste rules too. The opt-out of a rule that
// isn't a taste rule, at the end, is not taste lint's business.

// eslint-disable-next-line taste/no-pill -- ✗ taste-exemptions/no-inline-disable
export const dot = "size-icon rounded-full";

export const ring = "rounded-full"; // eslint-disable-line taste/no-pill -- ✗ taste-exemptions/no-inline-disable

/* eslint-disable taste/motion-tokens -- ✗ taste-exemptions/no-inline-disable */
export const fade = "transition-all duration-fast ease-standard";
/* eslint-enable taste/motion-tokens */

// eslint-disable-next-line -- ✗ taste-exemptions/no-inline-disable
export const pill = "rounded-full";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const unused = "rounded-tag";
