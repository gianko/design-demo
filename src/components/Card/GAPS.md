# Card: gaps

Each entry is one place where the brief, the ADRs or the tokens didn't decide something Card needed. It gives the call made and the alternative a human might prefer.

## Card has no semantic grouping

**Undecided:** Card renders a plain `<div>`. A card about one invoice could be an `<article>` or a `<section>` labelled by its Heading, so that a screen reader can list and jump between cards. Generated screens have no intrinsic elements (ADR 0004), so they can't add that markup themselves, and the brief doesn't mention landmarks.

**Call:** a `<div>` with no role. The Heading in its header already puts the card in the screen's heading outline.

**Alternative:** render a `<section>` with `aria-labelledby` pointing at the header's Heading, which would need Card to find or be handed the Heading's id. Or render an `<article>`, which needs no name.
