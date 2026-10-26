# Checkbox: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something Checkbox needed, the call made, and the alternative a human might prefer.

## Checkbox is in the spec step's registry though no UI spec should name it

**Undecided:** the spec says "Checkbox is never listed: DataTable renders it, so the UI spec never names it". But `generator/registry.ts` loads every `*.registry.ts` on disk, so Checkbox's entry reaches the spec step's system prefix, and nothing in gate 1 stops a UI spec from placing a standalone Checkbox, which nothing would wire.

**Call:** the entry exists, as every component's does, and its `use` line says "never place it in a UI spec yourself".

**Alternative:** a registry flag (say `internal: true`) that leaves an entry out of the spec step's view and the wire schema's `component` enum, so gate 1 rejects a Checkbox node as an unknown component, while the code step still sees it.

## The tick and dash are drawn inline, not Phosphor

**Undecided:** the brief names Phosphor, regular weight, for icons, but the icon map arrives with the first component that needs an icon (spec § After P0), and Phosphor isn't installed. A checkbox needs a tick and a dash.

**Call:** two inline paths on the box's 16-unit grid, stroked in `currentColor` at 2 units with round caps and joins, so the mark reads on a 16px box (Phosphor's regular `Check` would be 1px wide at that size).

**Alternative:** Phosphor's `Check` and `Minus` from the icon map once it exists, at regular or bold weight, so every mark in the library comes from one set.

## No width token for the minimum target

**Undecided:** the target must be 24×24px admin and 44×44px contractor, but the tokens have only `min-h-target`; there is no `min-w-target`, so a square target can't be stated in one token per axis.

**Call:** the root is `min-h-target aspect-square`, so its width follows its height. A style expectation asserts the input is 24×24 or 44×44 per density.

**Alternative:** a `size.min-width.target` density token (or a `size-target`), so the square is explicit and other small targets, such as a future IconButton, can use it too.

## Hover on a checked box is a small step in dark

**Undecided:** hover and pressed on a checked box use `accent-hover` and `accent-pressed`, as Button's primary does. In dark they step lightness by about 0.03 each (0.82 → 0.79 → 0.75). On a 44px button that reads; on a 16–20px box the change is visible but slight.

**Call:** the shared state roles, unchanged, so a checked box and a primary Button respond alike.

**Alternative:** larger dark-mode steps for `accent-hover` and `accent-pressed`, which would also strengthen Button's, or a hover that also tints the target behind the box (`surface-hover` on the root).
