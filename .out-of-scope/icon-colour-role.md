# An icon colour role

IconButton's glyph is `text-ink`, the colour of a quiet Button's label, and `text-disabled` when disabled, as a disabled Button's label is. There is no `icon` colour role, and the glyph isn't muted at rest.

## Why this is out of scope

The glyph is the whole of the control's label, so it takes the label's colour. An `icon` role would always equal `ink` (or whatever the label is), in both themes, and nothing would keep the two equal. A glyph muted at rest would make the sheet's close button harder to find on a surface already full of muted copy, and the button is already bare at rest, as a quiet Button is, so it doesn't compete with the sheet's content.

The design brief now says an icon takes the colour of its control's label, so later icons follow the same rule.

## When to reconsider

When an icon appears that isn't a control's label: a decorative or status icon beside copy, whose colour has to come from what it sits beside or what it means.

## Prior requests

- #249: "IconButton gap: The icon's colour role is unstated"
