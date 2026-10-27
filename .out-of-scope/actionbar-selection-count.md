# A count of the selected rows in ActionBar

ActionBar holds only the action's Button: its body slot allows Button and nothing else. It doesn't say how many rows the action will touch ("3 invoices selected"), and the Button's label is the UI spec's literal copy.

## Why this is out of scope

A count is live copy, and neither side can own it. A UI spec's copy is literal ([ADR 0004](../docs/adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)), so it can't hold a number that changes with the selection, and the library has no copy of its own to render one: "3 selected" or a placeholder filled into the Button's label would both put words in the library. Allowing Text in the bar would let a generated screen write a count that goes stale. The ticked rows already show the selection, right above the bar.

## When to reconsider

When the library gains copy it owns with interpolated values (a count, a date), for ActionBar or anything else; a count in the bar would then be one use of it.

## Prior requests

- #238: "ActionBar gap: The bar shows no count of the selected rows"
