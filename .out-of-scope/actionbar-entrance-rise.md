# A rise on ActionBar's entrance

ActionBar enters with `rows-selected`'s View Transition. Its view transition group is new-only, so it fades in at `base` with `standard` easing, as `src/styles.css` times every group, and fades out at `base-exit` with `exit`. It doesn't move.

## Why this is out of scope

The design brief lists "the bulk-action bar entering" as expected motion, and a fade at the selection's duration is that motion. The brief asks for motion that is "precise rather than plentiful", and the bar's signature moment is handing off to its toast, not arriving. A rise would need a hand-written keyframe (ADR 0005) and a rule for one entrance's new-only group, plus its own reduced-motion case, for a taste call the fade already covers.

## When to reconsider

When another raised element (a toast entering on its own, a sheet) gets a directional entrance, so the bar's fade reads as the odd one out, or when a review of the kept bulk-pay screen finds the bar's arrival easy to miss.

## Prior requests

- #237: "ActionBar gap: The bar fades in but doesn't rise"
