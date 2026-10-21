# Density follows the audience, not the component

Generated screens serve two people: the admin, who processes many contractor invoices a day, and the contractor, who visits a few times a month. The design brief picks a warm tone, which at full size slows down a dense invoice list. Rather than give up the warmth or the admin's throughput, the design system has two **density sets** (working density for admin screens, full room for contractor screens). They change only row heights, container padding, body size, icon size, surface radius and minimum target size. Colour, type families, radius roles, elevation and motion are shared.

## Considered options

- **One warm, roomy density everywhere**: rejected because it slows down the primary user.
- **Make the contractor the primary user**: rejected because the invoice list and bulk pay, the screens a design-systems evaluator scrutinises most, are admin screens.
- **One dense density everywhere**: rejected because contractor screens lose the reassurance the tone is meant to give, and 24px targets are too small on a phone.

## Consequences

Each screen brief has to say which audience it serves, so the right density set applies and gates can check against it. How components receive their density set is left to the component-build decisions.
