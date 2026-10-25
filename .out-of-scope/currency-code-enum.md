# A currency code enum

Amount's `currency` prop is `z.string().regex(/^[A-Z]{3}$/)`, described as an ISO 4217 code. A well-formed code that isn't a real currency, such as `ABC`, passes gate 1. There is no `z.enum` of currency codes.

## Why this is out of scope

The currency comes from the fixtures through a `{ "bind": ... }`, beside the amount it belongs to ([ADR 0004](../docs/adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)), so the spec step doesn't write a code itself. A made-up code would have to be typed as a literal, against the screen brief.

The two enums each cost more than they catch:

- An enum of the fixtures' codes (only `USD` today) would tie the registry to the fixtures, and need an edit whenever the data gains a currency.
- An enum of `Intl.supportedValuesOf("currency")` would add about 300 values to the registry, in the spec step's cached prompt prefix.

If a fake code is ever worth rejecting, a Zod `.refine()` against `Intl.supportedValuesOf("currency")` would do it at gate 1 without putting the list in the prompt.

## When to reconsider

When a generated UI spec writes a literal currency code instead of binding one.

## Prior requests

- #126: "Amount gap: The currency prop accepts any three capitals"
