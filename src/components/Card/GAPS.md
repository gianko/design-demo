# Card: gaps

Each entry is one place where the brief, the ADRs or the tokens didn't decide something Card needed. It gives the call made and the alternative a human might prefer.

## Cards stretch to the full width of the screen

**Undecided:** nothing sets a content width (Stack's and Screen's gaps already note there's no measure token). A Card placed in a Screen's column fills it. At 1280px the header's title and its StatusTag sit more than 1,000px apart (see the Full and NoFooter stories). That's hard to scan, and it doesn't match Stripe's compact surfaces.

**Call:** Card sets no maximum width. The screen decides how wide a card is, which today means as wide as the screen.

**Alternative:** a content-width token (for example `size.width.card`, around 480–560px) that Card applies as a `max-w`. Or a Grid component that lays cards out in columns, which payment-overview's three cards and payment-run would use.

## Card has no semantic grouping

**Undecided:** Card renders a plain `<div>`. A card about one invoice could be an `<article>` or a `<section>` labelled by its Heading, so that a screen reader can list and jump between cards. Generated screens have no intrinsic elements (ADR 0004), so they can't add that markup themselves, and the brief doesn't mention landmarks.

**Call:** a `<div>` with no role. The Heading in its header already puts the card in the screen's heading outline.

**Alternative:** render a `<section>` with `aria-labelledby` pointing at the header's Heading, which would need Card to find or be handed the Heading's id. Or render an `<article>`, which needs no name.
