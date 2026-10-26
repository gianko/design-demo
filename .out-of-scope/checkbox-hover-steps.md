# A stronger hover for a checked Checkbox

A checked or mixed Checkbox shows hover and pressed with the shared `accent-hover` and `accent-pressed` roles, as Button's primary does. In dark they step lightness by about 0.03 and 0.04 (0.82 → 0.79 → 0.75), smaller than light's 0.05 and 0.04. Checkbox doesn't get its own steps, and its root doesn't take `surface-hover` behind the box.

## Why this is out of scope

The roles are shared so that everything filled with the accent answers a pointer the same way. A checked box and a primary Button are both "the accent, under your pointer"; giving Checkbox bigger steps would make the same colour behave two ways. A wider dark step is a token change, and it would change Button's primary as much as Checkbox. That is a call to make on Button, where the step shows on a 44px fill, not on a 16–20px box.

Checkbox's hover isn't the main cue either. It only appears in a DataTable row, and saying which row the pointer is on is the row's job, a tint across the row if DataTable gives it one. The box's step only confirms it. A `surface-hover` tint behind the box would show a lone square in the middle of that row.

## When to reconsider

When dark-mode hover on a primary Button reads as too slight. Widen `accent-hover` and `accent-pressed` in `color.dark.json` then, and Checkbox follows. Or when Checkbox appears outside a DataTable, as a form field, where no row hover is around it.

## Prior requests

- #182: "Checkbox gap: Hover on a checked box is a small step in dark"
