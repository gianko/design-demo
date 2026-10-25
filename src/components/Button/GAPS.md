# Button: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something Button needed, the call made, and the alternative a human might prefer.

## Quiet Button's hover barely shows on the light page

**Undecided:** the brief gives a neutral control `surface-hover` and `surface-pressed`, but no quiet (unfilled) control. A quiet Button sits straight on `page`. In light, `surface-hover` (L 0.975) is one step from `page` (L 0.985), so its hover is barely visible in the contact sheet (`components-button--quiet--light-*--hover.png`). Dark is clearer.

**Call:** quiet uses the same `surface-hover` and `surface-pressed` as secondary, so it has one neutral state ramp.

**Alternative:** a deeper quiet hover, such as `surface-pressed` for hover and a new, deeper step for pressed, or a `surface-hover` that is darker in light mode for every neutral control.

## Quiet Button at rest looks like a label

**Undecided:** the spec asks for a quiet intent, and the brief keeps the accent for primary actions only. With no fill, no border and ink text at 600, a quiet Button at rest looks the same as a level 3 Heading or a field label. Nothing tells the eye it can be pressed until hover.

**Call:** quiet is ink text at the label role, with no fill or border at rest. The registry `use` line keeps it for minor actions.

**Alternative:** quiet text in `text-accent`, so every pressable thing shows the accent (a reading of "primary actions" that includes links and minor actions), or an underline on the label.

## No colour token for the progress edge

**Undecided:** the brief places the progress edge "along its button's bottom" but names no colour for it, and the tokens have no edge role.

**Call:** on primary, `bg-progress`; on secondary and quiet, `bg-accent`. The first build used `bg-on-accent`, a near-white that matched the page (1.03:1 in light), so the edge read as a notch cut from the button. Review renamed that token `progress` and made it the other theme's accent: `heather.820` in light and `heather.480` in dark, both 3.82:1 against `accent`, so the edge reads as a heather line on the fill.

**Alternative:** one `progress` role checked against `accent` and `surface` at 3:1, so the edge is the same colour on every intent. No current primitive passes both in light.

## Button fills a column Stack's width

**Undecided:** Stack's column stretches its children by default, so a Button placed directly in a column Stack is as wide as the column. The brief doesn't say whether a lone action is full width (common on a phone) or sized to its label.

**Call:** Button sets no width or self-alignment, so the layout around it decides. A Stack row, or a column with `align: start`, keeps it to its label's width.

**Alternative:** Button sizes to its label everywhere (`self-start`), with a `width: fill` prop for the contractor's phone, or Card's footer slot always lays its Buttons out as a row.
