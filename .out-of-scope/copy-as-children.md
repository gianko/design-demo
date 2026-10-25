# Copy as children on Text and Heading

Text and Heading take their copy through a required `text: string` prop. Neither takes its copy as `children`.

## Why this is out of scope

In the registry, `children` means a component's `body` slot, which holds other nodes, everywhere else. The flat UI spec ([ADR 0004](../docs/adr/0004-flat-library-only-ui-spec-and-zod-first-registry.md)) has no string children: a node's content is its props or the nodes in its slots. `children: z.string()` would be the one exception, a slot that isn't a slot.

```json
{ "id": "title", "component": "Heading", "props": [{ "name": "text", "value": "\"Payment status\"" }] }
```

Text and Heading make the same call, and they change together if it is ever reversed.

## Prior requests

- #97: "Text gap: Copy arrives as a text prop, not children"
- #119: "Heading gap: Heading takes its copy through `text`, as Text does"
