# A content width on Screen or Card

Screen sets no maximum content width, and no layout component bounds how wide its children run. Screen stays a plain padded block.

## Why this is out of scope

Line length is a typography setting. It is only right in `ch`, relative to the text's own size, so a parent's width can't express it, and a parent that holds headings, buttons or a table would narrow all of them. `lint/taste/RULES.md` (row `line-length`) gives line length to the component that holds the prose, so Text's `body` size is to set its own measure from a `size.width.measure` token (#95). As a `max-width` it is a ceiling, so Text still fills any narrower container.

The same holds for a Stack `justify: between` row, whose label and value can end up more than 1,000px apart directly in a Screen at 1280px. In the P0 briefs every label–value row sits inside a Card, so how wide it runs depends on how wide Card is, not on Screen or Stack.

## When to reconsider

A deliberate layout width, such as a narrow column for a form, is a separate need from line length. File it when a generated screen shows it: for example, if `invoice-review` still puts a label and its value about 1,000px apart once Card exists.

That has now happened: Card fills a Screen's column, so at 1280px its header puts a title and its StatusTag more than 1,000px apart. #147 reopens the layout width, on Card or as a layout that sets columns. Line length stays with Text.

## Prior requests

- #86: "Screen gap: No maximum content width"
- #113: "Stack gap: `justify: between` spreads a row across the full width of a wide screen"
