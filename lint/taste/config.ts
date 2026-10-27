// Each taste rule's config, exemptions included. This is the only place an
// exemption lives (lint/taste/RULES.md § Exemptions): a build session never
// edits it, and adding one is a human decision. There is no inline opt-out.

export const config = {
  // Library components that may be fully rounded, by name: in source, the
  // files under `src/components/<Name>/`; rendered, the element marked
  // `data-component="<Name>"` and everything inside it. Both are where every
  // component lives and what it marks (docs/spec.md § Component pieces).
  "no-pill": { exempt: ["Avatar"] },
  // Words that copy may write in capitals: every ISO 4217 currency code, and
  // the abbreviations finance copy writes that way.
  "no-all-caps": {
    allow: [
      ...Intl.supportedValuesOf("currency"),
      "IBAN",
      "BIC",
      "ID",
      "VAT",
      "PDF",
      "CSV",
    ],
  },
} as const;
