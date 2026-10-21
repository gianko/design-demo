# Button: gaps

Places where the design brief, ADRs or tokens didn't decide something Button needed. Each gives the call made and the alternative a human might prefer. None was resolved by editing tokens or the brief.

## Missing tokens

1. **No accent hover or pressed colour.** The brief gives hover a duration ("`fast` 120ms (press, hover colour)") but `tokens.css` has only `bg-accent`. Primary has no hover or pressed change, only `cursor-pointer`. Secondary hovers to `bg-surface-raised`. *Alternative*: add `bg-accent-hover` / `bg-accent-pressed` (a step of L in each theme), plus a pressed role for secondary.
2. **No edge that meets 3:1 for a control.** The brief says "the edges that identify a control 3:1", but the only border role, `line` (L 0.90 on a 0.985 page), is a hairline for flat surfaces. Secondary uses `border-line`, so its edge is well under 3:1, and the label alone identifies it. The light-mode screenshots show a faint white box. *Alternative*: a `border-control` role at about 3:1 against `page` and `surface` in both themes, shared with inputs.
3. **No disabled role.** ADR 0002 says disabled "uses colour roles" but names none. Disabled uses `bg-surface-raised text-ink-muted border-line` for both intents, so a disabled primary looks like a muted secondary. *Alternative*: explicit `bg-disabled` / `text-disabled` roles, or a heather-tinted disabled primary so it still reads as the main action.
4. **The label doesn't follow density.** `text-label` is a fixed 14px/600. Contractor body is 16px, so a contractor's 44px button carries a smaller label than the text around it. *Alternative*: make `label` a density token (14px admin, 16px contractor), as `body` is.
5. **Horizontal padding doesn't follow density.** `px-sm` (16px) at both densities. *Alternative*: a density-role inline padding for controls.

## Unstated states and scope

6. **Pending has no visual marker beyond its words.** Spinners loop, which the brief bans, so pending swaps the label for `pendingLabel` ("Paying 3 invoices") and keeps the colours. If a screen omits `pendingLabel`, sighted users see no change. *Alternative*: make `pendingLabel` required when `pending` is true (a Zod refine), or add a static Phosphor glyph while pending.
7. **Pending is `aria-busy` only, not `aria-disabled`.** The plan called for `aria-disabled="true"` so focus stays on the pressed button. Playwright's actionability check treats `aria-disabled` as disabled, and gate 7r's focus-on-click check clicks `button:not([disabled])`, so every Pending story timed out (run 1). Clicks are ignored in the handler instead, and the swapped label tells screen-reader users what's happening. *Alternative*: change the gate selector to also skip `[aria-disabled=true]` and restore `aria-disabled`, the better-practice semantics.
8. **No destructive, ghost or link intent.** The brief names no destructive action ("Cancel payment", "Remove contractor"), and status colours must not be borrowed, so there are two intents only. *Alternative*: a `danger` intent once the brief names a destructive role colour; a quiet text-only intent for dense row actions.
9. **No icon.** Phosphor sizes are specified (16/20px), but the brief doesn't say whether labelled buttons carry icons, and an icon prop would need a closed list of icon names in the registry. The registry's `use` line sends icon-only cases to IconButton. *Alternative*: an `icon` enum over a curated Phosphor set, rendered at `size-icon`.
10. **No `type="submit"`.** Always `type="button"`; forms (a contractor submitting an invoice) wire `onClick`. *Alternative*: a `type` prop in the registry once Form exists.
11. **No full-width option.** Contractor screens are often on a phone, where full-width primary actions are common; the brief is silent. *Alternative*: `width: "fit" | "fill"`, or let Stack stretch its children.
12. **"At most one primary per screen or bar"** is in the registry `describe` only, not enforced. *Alternative*: a gate 1 rule.

## Conventions this component set (no existing components to match)

13. **Optional props, not `.default()`.** Defaults sit in the component and in each prop's `describe`, so `z.infer` gives optional props as ADR 0004 asks; the JSON Schema has no `default` keyword. *Alternative*: `.default()` with props typed as `z.input`.
14. **Copy is a `label` prop, not `children`.** The UI spec carries every string as a literal prop (ADR 0004), and a string prop is checkable by gate 1. *Alternative*: `children: string`.
15. **Registry `slots: []`.** Read as UI-spec child slots (ADR 0004), which Button has none of, not as `tv()` slots.

## Gate runs

- Run 1: Pending stories timed out (see 7).
- Run 3: one story failed with "Axe is already running", a race between the gate's axe and Storybook's a11y addon (`a11y: { test: "error" }` in `preview.tsx`). The next run passed unchanged. *Alternative*: have the gate wait for the addon's run, or turn the addon's test off during gates.
