# Error and success tones on Text

Text has two tones, `default` (ink) and `muted` (ink-muted). There is no `error` or `success` tone, and no error or success text role in the colour tokens.

## Why this is out of scope

The brief says colour alone never communicates state. A failure result, such as `reminder-failed` or `invoice-queue`'s failed payment, is a live Text in plain ink that says in words what happened and what to do next. The status text roles (`text-overdue`, `text-failed`) are not a substitute: they belong to status tags, and `text-failed` is the light text that sits on the solid red fill, so it would be invisible on the page.

## When to reconsider

A failure tone arrives with Toast in P1 ([ADR 0011](../docs/adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md)). An `error` text role can be added then, if Toast needs one, AA-checked on page and surface.

## Prior requests

- #96: "Text gap: No error or success tone"
