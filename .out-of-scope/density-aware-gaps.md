# Density-aware gaps

Stack's gaps, and the gap between a Card's header, body and footer, are the fixed spacing steps at both densities. There are no density gap tokens, such as a `density.gap.group` that is tighter for admin.

## Why this is out of scope

[ADR 0001](../docs/adr/0001-density-by-audience.md) says the density sets change *only* row heights, container padding, body size, icon size, surface radius and minimum target size. Spacing between nodes isn't on that list. A Card's padding is container padding, so it follows density (#146), but the gap between its parts is spacing between nodes. A contractor screen gets its room from the wider page padding and the larger body size, and the spec step can still pick a wider step. Density-aware gaps would need an amendment to ADR 0001 first.

## Prior requests

- #110: "Stack gap: Stack gaps don't follow density"
- #146: "Card gap: Card padding and spacing don't follow density" (the gap between parts; the padding went ahead)
