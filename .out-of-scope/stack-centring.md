# Centred and end-aligned Stacks

Stack has no `justify: center` and no `align: end`. Its `align` options are `stretch`, `start`, `center` and `baseline`, and its `justify` options are `start`, `between` and `end`.

## Why this is out of scope

Every option is a choice a generated screen can get wrong, so Stack offers only what a P0 screen uses.

- **Centring along the main axis** is for empty states and confirmation moments. In P0, empty states are built from Heading and Text, and EmptyState waits for P1 (spec § Library widening). When a screen needs a centred empty state, centring belongs to EmptyState, not to a Stack option every screen could reach for.
- **End-aligning on the cross axis** is for a right-aligned column of amounts. Amounts right-align in tables (brief, **Amounts**), which is DataTable's job.

## Prior requests

- #112: "Stack gap: Stack can't centre on the main axis or end-align on the cross axis"
