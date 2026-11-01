# A rounded clip on a Card's moving edge

While a Card grows to uncover a Notice, or shrinks to cover one, the `card-result` view-transition group clips its images to a plain rectangle. For `base` (240ms) entering and `base-exit` leaving, the Card's moving bottom edge is a straight cut through the strip, without its hairline or rounded bottom corners. They come back when the transition ends.

## Why this is out of scope

The view-transition pseudo-elements hang off the document root, outside the Screen's density scope, so they can't read the density's surface radius, the Card's `rounded-surface` (8px admin, 12px contractor). Toast's slide distance has the same limit with the page padding. A clip that matches the Card needs the density to reach `:root`. That's a change to how [ADR 0001](../docs/adr/0001-density-by-audience.md)'s density scope works, and it isn't worth making for a quarter-second of motion.

The cheap alternative, a clip fixed at the larger radius (12px), trades one mismatch for another:

- An admin Card's corners are 8px, so its moving edge would round more than its own corners, and snap from 12px to 8px when the transition ends. A flat cut at least reads as "mid-motion". A wrong radius reads as a different shape.
- It brings back the corners but not the hairline: the clip doesn't draw a border.
- The 12px would be a raw value outside the token system, a copy of the contractor radius that drifts if that token changes.
- A plain `border-radius` on the group would also round the top corners, which are already correct. Avoiding that needs a bottom-only `clip-path: inset(0 round 0 0 12px 12px)`.

## When to reconsider

If the density ever reaches the root (for example, a root-level variable set per density, or one density per page), give the group a radius from it. The same change would let Toast's slide read the page padding.

## Prior requests

- #373: "Notice gap: the Card's moving edge is cut flat during the collapse"
