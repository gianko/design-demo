# An `empty` slot on DataTable

EmptyState is a sibling of the DataTable, not inside it. A UI spec shows it `when: [empty]`, where the DataTable goes, and leaves the DataTable out of that state. EmptyState draws the table's own flat frame, so the empty list keeps the table's outline. DataTable has no `empty` slot that renders an EmptyState under its column headers when `rows` is empty.

## Why this is out of scope

An empty state doesn't always replace just a table. In annual-summary one EmptyState takes the place of two Cards and the DataTable together, which a slot on the table couldn't express. Every P1 screen brief already words it as the EmptyState "taking the DataTable's place". The `empty` state is a declared screen state with its own fixture variant, like every other state ([ADR 0011](../docs/adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md)), so showing the EmptyState through `when` is the same mechanism as everything else, not a special case. A slot would give the spec step two ways to show an empty list.

Column headers over no rows also say nothing an empty list needs.

## When to reconsider

When a screen needs the column headers to stay visible over an empty list, such as a filtered table whose filter emptied it, where the headers explain what's missing.

## Prior requests

- #246: "EmptyState gap: An empty state stands in place of the DataTable, not inside it" (its gate 1 half was taken)
