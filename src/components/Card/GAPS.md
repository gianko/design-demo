# Card: gaps

Each entry is one place where the brief, the ADRs or the tokens didn't decide something Card needed. It gives the call made and the alternative a human might prefer.

## Card padding and spacing don't follow density

**Undecided:** the brief sets page padding per density (28px admin, 36px contractor) and the surface radius per density (8px, 12px), but it gives no padding for a surface. ADR 0001's list of what density changes includes "container padding", and the only density padding tokens are `p-page` and `px-control`, which are named for other roles. The brief also doesn't say how far apart a card's header, body and footer sit, or whether a hairline divides them.

**Call:** fixed `p-lg` (24px) padding and a `gap-md` (20px) between the parts at both densities, with no dividers. A contractor card gets more room only through its 12px radius and larger body text, so admin and contractor cards look almost the same size apart from their type.

**Alternative:** a density token for surface padding (for example `density.padding.surface`: 20px admin, 24–28px contractor) and maybe one for the gap between a surface's parts. Or reuse `p-page` on Card, which reads as roomier on contractor screens but doubles the page's padding inside every card.

## Cards stretch to the full width of the screen

**Undecided:** nothing sets a content width (Stack's and Screen's gaps already note there's no measure token). A Card placed in a Screen's column fills it. At 1280px the header's title and its StatusTag sit more than 1,000px apart (see the Full and NoFooter stories). That's hard to scan, and it doesn't match Stripe's compact surfaces.

**Call:** Card sets no maximum width. The screen decides how wide a card is, which today means as wide as the screen.

**Alternative:** a content-width token (for example `size.width.card`, around 480–560px) that Card applies as a `max-w`. Or a Grid component that lays cards out in columns, which payment-overview's three cards and payment-run would use.

## Nothing in gate 1 stops a Card inside a Card

**Undecided:** the brief bans the SaaS-card kit, and `lint/taste/RULES.md` names `nested-cards`, but that rule isn't in P0, and its render check isn't built yet. A UI spec can put a Card in another Card's `body` directly or through a Stack, and only that future rule would catch it.

**Call:** `header` and `footer` have allow-lists that leave Card out. `body` allows any component, because a list there would have to name every future content component. The `use` line tells the spec step "Never put a Card inside a Card".

**Alternative:** a gate 1 rule that rejects a Card with a Card anywhere beneath it, which also covers the path through a Stack. Or an allow-list on `body` too, updated as each component joins.

## Card has no semantic grouping

**Undecided:** Card renders a plain `<div>`. A card about one invoice could be an `<article>` or a `<section>` labelled by its Heading, so that a screen reader can list and jump between cards. Generated screens have no intrinsic elements (ADR 0004), so they can't add that markup themselves, and the brief doesn't mention landmarks.

**Call:** a `<div>` with no role. The Heading in its header already puts the card in the screen's heading outline.

**Alternative:** render a `<section>` with `aria-labelledby` pointing at the header's Heading, which would need Card to find or be handed the Heading's id. Or render an `<article>`, which needs no name.
