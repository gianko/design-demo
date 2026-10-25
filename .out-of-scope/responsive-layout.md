# Breakpoints and rows that don't wrap

A Stack row always wraps. There is no `wrap` prop, no `direction: responsive`, and no breakpoint token or responsive vocabulary in the UI spec.

## Why this is out of scope

Wrapping is the safe default for a contractor, who is often on a phone: a row of a long client name, an invoice number and a due date moves onto a second line instead of spilling off a 360px screen. No P0 brief asks for a row that has to stay on one line, and rows of tabular data belong to DataTable. Breakpoints would also need a breakpoint token the brief doesn't have.

## When to reconsider

When a screen needs a row that must stay on one line and truncate, or a layout that changes direction with the viewport.

## Prior requests

- #111: "Stack gap: Stack rows always wrap, with no breakpoints"
