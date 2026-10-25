# A default gap between Screen's children

Screen doesn't space its children. Two top-level children with no Stack around them touch.

## Why this is out of scope

Spacing between components belongs to Stack ([ADR 0002](../docs/adr/0002-token-only-tailwind-and-eslint-token-lint.md)), and Screen's registry `use` line tells the spec step to wrap more than one child in a Stack. A default gap on Screen, such as `gap-lg`, would add a second way to space the top level of a screen, and generated screens would mix the two.

## Prior requests

- #87: "Screen gap: Screen doesn't space its children"
