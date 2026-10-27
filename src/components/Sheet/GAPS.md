# Sheet: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something Sheet needed, the call made, and the alternative a human might prefer.

## A native dialog stands in for the Radix Dialog

**Undecided:** ADR 0006 says "the row → sheet transition uses the View Transitions API with a Radix Dialog", with focus returning to the row "through `onCloseAutoFocus`". Radix isn't installed (Checkbox and IconButton made the same call), and a build session doesn't add dependencies.

**Call:** a native `<dialog>` opened with `showModal()` in a layout effect. It gives the top layer, the `::backdrop` the scrim paints, an inert page behind it and Escape as a close request, which Sheet takes over so DataTable closes it through its View Transition. Sheet focuses the dialog on open and, on unmount, focuses whatever had focus when it opened (the row), which is what `onCloseAutoFocus` would have done. `Sheet.test.tsx` covers the focus round trip and Escape.

**Alternative:** install `@radix-ui/react-dialog` and build Sheet on `Dialog.Content`, as ADR 0006 has it, or amend ADR 0006 to name the native dialog.

## No surface role sits above surface-raised

**Undecided:** the brief has three elevation levels and says "in dark mode, levels are lighter surfaces", but the colour roles have only `surface` and `surface-raised`. An overlay sheet has no lighter surface to take than the raised bars and toasts already use.

**Call:** `bg-surface-raised`, the highest surface there is, with `shadow-overlay` and the scrim telling the overlay apart from raised. In dark, `surface-hover` is the same value as `surface-raised`, so the close button's hover can't be seen on the sheet (IconButton's gap #250, confirmed in this build's dark hover shots); pressed and the focus ring still show.

**Alternative:** a `surface-overlay` role, a step lighter than `surface-raised` in dark (about `oklch(0.31 0.025 330)`) and the page's near-white in light, which Sheet and later menus or modals would use. A dark `surface-hover` that differs from both would also settle #250.

## Sheet's allow-list stops at its direct children

**Undecided:** the spec limits Sheet's children to Heading, Text, Amount, StatusTag and Stack "so that I can't nest a Card or put an action in a sheet". The registry's slot allow-lists hold only for a slot's direct children, and Stack's body takes anything, so a UI spec can put a Button or a Card in a Stack in a Sheet and gate 1 passes it. Gate 1's `nested-cards` rule looks only for a Card inside a Card.

**Call:** the slot allow-lists, which gate 1 enforces on the Sheet's own children (tested against the library's registry). A Card deeper down would still meet the `nested-cards` render rule once it is drawn.

**Alternative:** a gate 1 rule that holds the Sheet's allow-list over every node beneath it, through Stacks, so a deep Button or Card fails with the Sheet named.

## The nested-cards render rule reads a modal Sheet as inside its DataTable

**Undecided:** the `nested-cards` render rule walks DOM ancestors to find the surface a painted box sits in. A Sheet is a modal dialog in the top layer, drawn over the page, but in the DOM it sits wherever its parent renders it. If DataTable (#214) renders the opened row's Sheet inside its own rounded, bordered root, the rule reads the Sheet, which casts a shadow, as a card inside the table and fails the render.

**Call:** nothing in Sheet: its own stories render it alone and pass. DataTable will need to render the Sheet outside its painted root, as a sibling after it.

**Alternative:** the rule treats a box in the top layer (`:modal`, or `:popover-open`) as its own surface rather than one inside its DOM ancestors, so where DataTable puts the node in the DOM stops mattering.
