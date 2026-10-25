# A status tag type role

StatusTag uses the `label` type role: body size (14px admin, 16px contractor) at weight 600, with no vertical padding, so a tag is exactly as tall as the line of text beside it. There is no separate `tag` role and no smaller tag size.

## Why this is out of scope

`label` is already the semibold, body-size style a status word wants, and it follows density, as body text does. A 12px tag would make the word smaller in admin tables, the thing an admin scans a list for, and at 12px on a contractor card it would look small beside 16px body text. The only 12px role, `caption`, is weight 400, which loses weight on a tint, and there are no standalone weight utilities to make it 600 ([ADR 0005](../docs/adr/0005-dtcg-tokens-hand-built-into-css-ts-and-figma.md)). A role used by one component alone is not worth adding; `.out-of-scope/subheading-type-role.md` made the same call for heading level 3.

## When to reconsider

When DataTable arrives. The brief already gives table headers a 12px, 600 style (`docs/design-brief.md` § Type), so DataTable will add that role anyway. Then the only question left is whether a tag in an admin table should use the header style, a one-class change with no new role.

## Prior requests

- #129: "StatusTag gap: No type role or height for a status tag"
