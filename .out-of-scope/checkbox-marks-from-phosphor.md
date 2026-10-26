# Checkbox's tick and dash from Phosphor

Checkbox draws its tick and its dash itself: two paths on the box's 16-unit grid, stroked in `currentColor` at 2 units with round caps and joins. They don't come from Phosphor's `Check` and `Minus`, and they won't move to the icon map once it exists.

## Why this is out of scope

The brief's Phosphor rule (`docs/design-brief.md` § Icons and copy) is about icons: a glyph beside content, 16px on admin screens and 20px on contractor screens. A checkbox's mark isn't one. It is part of the control, drawn inside a 16px or 20px box and sized to it, like the box's edge or its fill.

At that size Phosphor doesn't read as a mark. Regular weight strokes at 16 units on a 256-unit grid, so its `Check` is 1px wide on the admin box. Bold is 1.5px. Checkbox's own paths are 2px on the admin box and 2.5px on the contractor one, enough to read on the accent fill. Taking Phosphor's paths and thickening them would be redrawing them anyway.

## When to reconsider

When a tick or a dash is needed outside a control's box, such as a "paid" mark in a table cell or beside a status. That one is an icon, and comes from the icon map. If the two then look like different families side by side, match Checkbox's mark to the icon's shape, keeping its weight.

## Prior requests

- #180: "Checkbox gap: The tick and dash are drawn inline, not Phosphor"
