# Quiet Button affordance

A quiet Button is ink text at the `label` role, with no fill, border or underline at rest. Only hover and pressed give it a fill. There is no quiet intent with accent-coloured or underlined text.

## Why this is out of scope

The brief keeps the accent "for primary actions, selection and focus only" (`docs/design-brief.md` § Colour), so that "what can I do here" stays obvious. Accent text on a minor action would compete with the screen's one primary Button. An underline would make the action read as a link, which goes somewhere, rather than as a button, which does something.

A quiet Button isn't meant to stand on its own. Its registry `use` line keeps it "for a minor one" beside a primary or secondary action, and its label is a verb ("Send reminder"). Next to a filled button, that is enough to tell it apart from a level 3 Heading or a field label.

## When to reconsider

When a screen needs a quiet Button with no primary or secondary beside it, such as the only action in a Card row. Then nothing nearby says it can be pressed, and the question becomes a quiet treatment that shows at rest without using the accent.

## Prior requests

- #134: "Button gap: Quiet Button at rest looks like a label"
