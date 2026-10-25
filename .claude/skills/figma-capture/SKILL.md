---
name: figma-capture
description: Capture a kept screen's stories into the Dill Demo Figma file in light and dark, then check what they bound. Usage: /figma-capture <screen slug>
disable-model-invocation: true
---

You drive the capture of [ADR 0007](../../../docs/adr/0007-figma-sync-is-a-generated-one-call-script.md): `generate_figma_design` against Storybook's standalone iframe, then a read-only walk of what the captures bound. You are a courier. Figma's capture script (`.storybook/preview-head.html`) does the capturing, and `pnpm figma:walk-capture` writes the only Plugin API code you pass. If something needs any other Plugin API code, stop and tell the human.

The file is [Dill Demo](https://www.figma.com/design/qgCHZ55XTiozWpZvASRzJE/Dill-Demo), `fileKey` `qgCHZ55XTiozWpZvASRzJE`. It runs on the human's Figma login, in their browser. Before the first call, load `figma:figma-use` and open a session with `create_session`, as the Figma MCP asks, and pass its ID on every call after.

## 1. List the captures

Start Storybook once with `pnpm storybook` in the background, and wait until `http://localhost:6006/index.json` answers.

The screen is `src/screens/<slug>/`. Each of its stories is captured once in `light` and once in `dark`; take their IDs from `index.json`. The density is the `audience` the screen passes to `<Screen>`, and every capture of the screen uses it. If the screen sets `audience` from anything but a literal, ask the human which density to capture.

The step is done when the human has seen the list (story × theme, with the density).

## 2. Find the Screens page

Call `get_metadata` with no `nodeId` to list the pages. Captures land on the page named `Screens`; its ID is the `nodeId` for every capture. If there's no `Screens` page, ask the human to add one in Figma, then list the pages again.

## 3. Capture each story × theme

For each capture:

1. Call `generate_figma_design` with the `fileKey`, the Screens page's `nodeId`, and the session ID. It returns a capture ID and the hash parameters to open.
2. Open the story's standalone iframe in the human's browser with `open "<url>"`: `http://localhost:6006/iframe.html?id=<story>&viewMode=story&globals=theme:<theme>;density:<density>`, then `#` and the hash parameters the tool returned, plus `figmaselector=%23storybook-root` so the capture crops to the story.
3. Poll `generate_figma_design` with the capture ID every 5 seconds, up to 10 times, until its status is `completed`. Note the captured frame's node ID. If it's still `pending` after 5 polls, ask the human what the browser tab shows (an error, or Figma's capture toolbar) before polling on: the tab is the only place a failed capture says why.

Each capture ID captures one page, once. A capture that doesn't complete gets a fresh ID, never a reopened one.

The step is done when every story × theme on the list has a completed capture and a node ID.

## 4. Walk the captures

Run `pnpm figma:walk-capture <id>,<id>,…` with every node ID from step 3, read the file it prints, and pass its whole content as `code` to `use_figma`. The call only reads.

Show the human, per frame: its `modes`, then `bound` by kind, then `missing`, then `literal`.

The capture is done when, for every frame:

- `modes` holds one mode per collection: `Color` the frame's theme and `Density` its density. The capture pins only a non-default mode, so a collection absent from `modes` is at its default (`Light`, `Admin`).
- `literal` is empty: every opaque fill and stroke is bound. A `fills mixed` entry is text with more than one fill; check it by eye in Figma.
- `missing` lists only kinds the screen doesn't use (a screen with no rounded corners binds no radius). Name each one to the human, who confirms it.

Anything else, show it to the human and stop. A `literal` paint usually means the variable's Figma value drifted from the colour the browser painted, so the capture couldn't match it. Compare the two before anything else ([issue #59](https://github.com/gianko/design-demo/issues/59)).

These misses are known and expected ([issue #15](https://github.com/gianko/design-demo/issues/15)): alpha colours (the scrim, transparent borders), `min-height`, text and effect styles, and motion. Line height and letter spacing bind by value and can land on another role's variable ([issue #104](https://github.com/gianko/design-demo/issues/104)). They are no reason to recapture.

## Recapturing

A capture adds frames beside the earlier ones, so earlier captures of the same story stay on the Screens page. Give the human their node IDs; deleting them is the human's call.
