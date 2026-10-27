# An icon and an action on EmptyState

EmptyState is two lines of copy: why the list is empty and, where it helps, what will appear there. It has no icon and no `actions` slot.

## Why this is out of scope

No screen brief asks an empty list to start anything: every empty list in the P1 briefs fills itself (contractors send invoices, Northwind pays them). An icon in a rounded tile above a title is the `icon-tile-stack` template tell, and `lint/taste/RULES.md` names EmptyState as the only component that could commit it. The copy already does the work the brief asks for.

## When to reconsider

An `actions` slot allow-listed to Button, when a brief has an empty list the user can fill themselves ("Create your first invoice"). A small Phosphor icon beside the title (never a tile above it), once the icon map is public and a brief shows the copy alone isn't enough.

## Prior requests

- #248: "EmptyState gap: An empty state has no icon and no action"
