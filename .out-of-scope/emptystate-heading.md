# A Heading for EmptyState's reason

EmptyState's `title`, why the list is empty, renders as a paragraph at body size and weight 600, not as a heading. It adds nothing to the screen's heading outline. P0's hand-built empty states used a level 2 Heading for the same copy.

## Why this is out of scope

The reason stands in for the table's rows, not for a section of the page. The DataTable it replaces has no heading of its own, so a heading would appear in the outline only while the list is empty, then vanish once rows arrive. A paragraph also can't skip a level, wherever a screen places it, so gate 1 needs no level check for it. It still comes first after the PageHeader or the screen's Heading, so a screen-reader user meets it straight away.

## When to reconsider

When an empty state stands for a whole section that has a heading in its filled form (a titled panel, a Card with a header), so the heading belongs in both forms.

## Prior requests

- #247: "EmptyState gap: The reason is a paragraph, not a Heading"
