# Button width

Button sets no width or self-alignment, so the layout around it decides. In a Stack row, or a column with `align: start`, it is as wide as its label. Placed directly in a column Stack, which stretches its children by default, it fills the column. There is no `width` prop and no `self-start`.

## Why this is out of scope

Width is the layout's call, not the action's. The same Button is full width at the foot of a contractor's phone screen (`docs/design-brief.md` § Who it's for: "often on a phone") and label-width beside a primary action on an admin screen. Stack already says which: `align: start` keeps a column's children to their own width, and its registry entry says a column stretches by default.

A fixed `self-start` would make every lone action label-width, including on the phone, and a `width` prop would ask the spec step to decide something Stack already decides.

## When to reconsider

When Card's footer slot is built: most actions will sit there, so the footer may lay out its Buttons as a row itself. Also if generated screens keep placing a lone Button straight in a column on admin screens, where a full-width button looks out of place.

## Prior requests

- #137: "Button gap: Button fills a column Stack's width"
