# Dismissing a toast

A Toast shows while the screen is in the state that names it, and leaves when the screen leaves that state, such as a retry that's confirmed after a failure. It has no timer and no close button.

## Why this is out of scope

A timer would be a state change the system starts. Generated screens hold no state of their own, and every state change comes from something the user did or an operation settling ([ADR 0011](../docs/adr/0011-motion-follows-declared-state-changes-owned-by-the-library.md)). A toast that leaves on its own also fails WCAG 2.2.1 (timing adjustable) unless it offers a way to pause or extend it, and a reader who looks away misses the result. Each screen state is rendered, gated, baselined and captured in Figma as a still, and a toast that stays is what those renders show.

A close button adds a control whose only job is to hide the confirmation, and a state change the UI spec can't name.

## When to reconsider

When a screen has to go on working after a result with the toast in the way (it covers content the user needs next), or when IconButton is public and a dismissed toast can be modelled as a declared state change rather than a timer.

## Prior requests

- #242: "Toast gap: A toast stays for as long as its screen state"
