# Two Cards named `card-result` at once

A Card carries the fixed view transition name `card-result` while it holds a Notice, while its footer's Button is pending, and for the state entry in which it lost its Notice ([ADR 0016](../docs/adr/0016-an-actions-result-on-a-card-is-a-notice-on-its-bottom-edge.md)). A view transition name must be unique in a snapshot. So if two Cards carry it at once, the browser skips that View Transition: the update still runs and the screen lands in the right state, but without the motion. That happens with two pending Buttons on different Cards, or with a Card holding a Notice while another Card's Button is pending.

## Why this is out of scope

No brief puts actions on two Cards, so the motion isn't lost on any screen we generate. The fix on hand, `view-transition-name: match-element` with a `card-result` view-transition class, breaks the convention that a `vt-*` class names the name it sets. Screen's focus rule ([ADR 0011](../docs/adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md)) reads that convention: when an update removes the focused element, focus moves to the element that took over its name, and where nothing computes styles it reads the name from the `vt-*` class. `src/styles.test.ts` relies on the same convention. Taking that on for a case no screen has isn't worth it. When it fails, it skips the motion and nothing else, so nothing breaks.

## When to reconsider

When a brief puts actions on two Cards on one screen. The options then:

- `match-element` plus a change to how the focus rule looks up names, since a `match-element` name is unique per element and no longer matches the class.
- A gate 1 rule allowing at most one Card with an action per screen, which keeps the fixed name and makes the limit a spec rule rather than a silent skip.

## Prior requests

- #372: "Notice gap: two Cards named card-result at once skip the transition"
