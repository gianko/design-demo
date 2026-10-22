# figma:sync-tokens is a generated script, run in one use_figma call

The token build's Figma payload is wrapped by a generator in a fixed runtime, producing one Plugin API script. The agent passes that script verbatim to `use_figma`. A `use_figma` call is a transaction: a thrown error rolls back everything the call wrote. So a single call makes the sync atomic. The full token set (106 variables, 6 text styles, 2 effect styles) is 29K characters, well under the tool's 50,000-character `code` limit, and ran without a timeout. The script upserts by stable name, reports orphans without deleting them (only an explicit `--prune` deletes, by exact ID), and in dry-run mode returns the diff instead of writing. `use_figma` only takes code inline, so the model re-types the script on every call. To guard that, the script checks a checksum of its own data and throws on a mismatch, which writes nothing. The `figma:sync-tokens` skill is a thin driver: generate, dry-run, show the diff, apply on confirmation. It never writes Plugin API code. Findings are in [Figma spike: variables, a component frame, a capture, and the shape of figma:sync-tokens](https://github.com/gianko/design-demo/issues/15).

## Decisions that come with it

- **No verification read after a write.** Every write script returns its own evidence: created, updated and unchanged counts, orphans, binding flags, and resolved values per mode. Combined with the rollback, a separate read proves less than the write's own return does. A capture can optionally be checked with a read-only `use_figma` walk of `boundVariables`.
- **Every theme value is a `--ds-*` CSS variable**: spacing, radius, type and motion as well as colour and density. Captures bind only through code syntax. A literal inside `@theme inline` compiles to a bare value with nothing to match.
- **Font weight is two shared variables**, `type/weight/regular` (400) and `type/weight/semibold` (600), not one per role. Tailwind emits weight through `--tw-font-weight`, so captures bind weight by value and scope. With per-role weights, that fallback picked the wrong role.
- **Text styles bind family, size, line height, weight and tracking to variables.** Tracking is authored in px at the role's size ([ADR 0005](0005-dtcg-tokens-hand-built-into-css-ts-and-figma.md)), so it needs no conversion. Styles bound to `Density` variables resolve per frame mode, so `label` and `body` are one style each.
- **Motion is `TIMING` and `EASING` variables** with code syntax but no scopes, because Figma throws on scopes for these types. Captures don't bind them.
- **Shadows follow the theme.** Each elevation is one effect style, and every field of every layer (`color`, `offsetX`, `offsetY`, `radius`, `spread`) is bound to a Light/Dark variable in the `Color` collection, scoped `EFFECT_FLOAT`/`EFFECT_COLOR`. Light resolves to drop shadows and dark to the ring. The build pads both themes to the same layer count with empty layers.
- **Component frames use the same pattern**: a deterministic script that finds the page, set, variants and preview frame by name, rebuilds bindings in place, and adds missing variants with `appendChild`.
- **Captures target Storybook's standalone iframe**: `iframe.html?id=<story>&globals=theme:…;density:…`, with the capture script in `.storybook/preview-head.html`. Captures set explicit Color and Density modes themselves.

## Considered options

- **A skill that writes `use_figma` code each run**: flexible, but not deterministic, with no real dry-run diff, and the model is guessing at the Plugin API every time.
- **One call per collection** (Figma's "20–30 variables per call" advice): smaller calls, but a mid-sync failure leaves Figma half-updated. The generator keeps this as `--split` for when the payload outgrows 50,000 characters.
- **One `get_metadata` read after each write**: shows structure, not bindings, and spends read budget whose `use_figma` accounting isn't observable.
- **Light-only effect styles**: smaller, but dark frames in Figma would show the wrong elevation.
