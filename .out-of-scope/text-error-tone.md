# Error and success tones on Text

Text has two tones, `default` (ink) and `muted` (ink-muted). There is no `error` or `success` tone, and no error or success text role in the colour tokens.

## Why this is out of scope

The brief says colour alone never communicates state, and Text is plain copy, not a result. An action's result is a Notice on its Card's bottom edge, or a Toast for a table's result or one whose Card has left ([ADR 0016](../docs/adr/0016-an-actions-result-on-a-card-is-a-notice-on-its-bottom-edge.md)); no result is a live Text any more. So a failure's look, such as `reminder-failed`'s, belongs to Notice and its inline error pair, and to the failure Toast's `error` pair, and both still say in words what happened and what to do next. The status text roles (`text-overdue`, `text-failed`) are not a substitute: they belong to status tags, and `text-failed` is the light text that sits on the solid red fill, so it would be invisible on the page.

## When to reconsider

When copy that isn't an action's result, such as a field's validation message, needs to read as an error or a success on its own, outside a Notice or a Toast, and no component is planned for it. A tone would then need its own text role, AA-checked on page and surface.

## Prior requests

- #96: "Text gap: No error or success tone"
- #356: an action's result on a Card had no look of its own as a live Text; it became a Notice, not a Text tone
