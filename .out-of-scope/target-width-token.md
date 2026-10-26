# A width token for the minimum target

The density tokens have one size for the minimum target, `density.min-height.target` (24px admin, 44px contractor), used as `min-h-target`. There is no `min-w-target` or `size-target`. A square target, such as Checkbox's, is `min-h-target aspect-square`: its width follows its height.

## Why this is out of scope

A square target has one size, and a second token would state it twice. `min-w-target` would always have to equal `min-h-target`, in both densities, in the CSS, the TS export and `figma.json` ([ADR 0005](../docs/adr/0005-dtcg-tokens-hand-built-into-css-ts-and-figma.md)). Nothing would keep the two equal except whoever edits the JSON. `aspect-square` can't drift.

Checkbox's stories assert the result, so the square is checked even though it isn't spelled in one token: each density's story expects the input to be 24×24 or 44×44.

## When to reconsider

When a target needs a minimum width that isn't its height, such as a control that must stay wider than it is tall at every density. That width is a different size, and gets its own token. A future IconButton's square target is not that case; it uses `min-h-target aspect-square` as Checkbox does.

## Prior requests

- #181: "Checkbox gap: No width token for the minimum target"
