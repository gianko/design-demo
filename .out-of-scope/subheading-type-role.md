# A subheading type role

Heading level 3 uses the `label` type role: body size (14px admin, 16px contractor) at weight 600. There is no separate `subheading` role.

## Why this is out of scope

The type tokens name `title` (24px) and `heading` (20px) at 600, which levels 1 and 2 use, and the brief's scale has nothing between 20px and body size. `label` is already the 600-at-body-size style a small heading wants, and it follows density, as body text does. Using `heading` for level 3 instead would make levels 2 and 3 look the same.

The cost is that a level 3 heading looks the same as a field label. P0 has no form screens (spec § Rules every brief follows), so no P0 screen has field labels to confuse it with.

## When to reconsider

When form screens arrive and a level 3 heading can sit on the same screen as field labels.

## Prior requests

- #116: "Heading gap: Heading level 3 borrows the label type role"
