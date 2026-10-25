# Screen as a plain `<div>`

Screen renders `<main>`, not a plain `<div>` with no landmark.

## Why this is out of scope

A UI spec's one root is a Screen, and a generated page is one UI spec, so the page has one `main`, and screen readers can jump to it. Generated screens are hosted only by Storybook and the Figma capture, neither of which brings a `main` of its own, and axe passes.

## When to reconsider

If generated screens are ever mounted inside an app shell that has its own `main`, two `main` landmarks would fail axe's `landmark-no-duplicate-main`, and Screen would need to become a plain `<div>` or take its element from the host.

## Prior requests

- #88: "Screen gap: `main` landmark"
