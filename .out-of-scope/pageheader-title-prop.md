# A string title on PageHeader

PageHeader's `title` is a registry slot that allows only Heading, and its `use` line asks for the screen's level 1 Heading there. It has no `title: string` prop that renders its own `<h1>`.

## Why this is out of scope

Gate 1's heading checks (`generator/gate1.ts`, `headingChecks`) read the UI spec's Heading nodes: one level 1 in each screen state, and no skipped levels. A title PageHeader rendered from a string would be invisible to them. invoice-review's Card header Heading (level 2) would fail `heading-one` for having no level 1, and a spec step that added a level 1 Heading as well would put two `<h1>`s on the page. Counting a PageHeader as a level 1 in gate 1 would make it the one heading that isn't a Heading.

The title's copy also stays where every other heading's is, on Heading's `text` prop (`copy-as-children.md`):

```json
{ "id": "title", "component": "Heading", "parent": "header", "slot": "title", "props": [{ "name": "level", "value": "1" }, { "name": "text", "value": "\"Invoices\"" }] }
```

The slot does accept a level 2 Heading. `heading-one` still fails a state that shows no level 1, so a screen can't ship without one; it can only put its level 1 somewhere other than the PageHeader.

## When to reconsider

When generated screens put a level 2 Heading in the title and their level 1 elsewhere, gate 1 could check that a PageHeader's title holds a level 1 Heading, keeping the slot.

## Prior requests

- #174: "PageHeader gap: PageHeader's title is a Heading slot, not a string prop"
