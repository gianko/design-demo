// Focus follows the view transition name (ADR 0011, #244). A screen-state
// change can remove the element that has focus, such as the bar's pending
// Button when a confirmed result leaves the bar out, and focus would fall to
// the document. So after the change's update, if what had focus is gone,
// focus moves to the element that took over its name, the one the old
// element turned into (the success Toast the bar became) if it takes focus,
// or else to the Screen it was in. Both are focusable from script only
// (`tabIndex={-1}`).
// If focus stays, or wasn't on anything, nothing moves.

// The class prefix of the library's view transition names (src/styles.css).
const prefix = "vt-";

// The view transition name `element` carries: its computed one, or, where
// nothing computes styles (jsdom), the one its `vt-*` class declares.
function nameOf(element: Element): string | null {
  const computed = getComputedStyle(element).viewTransitionName;
  if (computed && computed !== "none" && computed !== "auto") return computed;
  for (const each of element.classList) {
    if (each.startsWith(prefix)) return each.slice(prefix.length);
  }
  return null;
}

// The name the focused element moves with: its own, or its nearest
// ancestor's that has one (a Button in the bar moves with the bar).
function carriedName(element: Element): string | null {
  for (let at: Element | null = element; at; at = at.parentElement) {
    const name = nameOf(at);
    if (name !== null) return name;
  }
  return null;
}

// Wraps a screen-state change's `update` so that, once it has run, focus
// lands where ADR 0011 says when the update removed the focused element.
export function keepingFocus(update: () => void): () => void {
  return () => {
    const focused = document.activeElement;
    const had =
      focused instanceof HTMLElement && focused !== document.body
        ? focused
        : null;
    const name = had && carriedName(had);
    const screen = had?.closest<HTMLElement>('[data-component="Screen"]');
    update();
    if (!had || had.isConnected) return;
    const heir =
      name === null
        ? undefined
        : [
            ...document.querySelectorAll<HTMLElement>(`[class*="${prefix}"]`),
          ].find((each) => nameOf(each) === name);
    // The heir takes focus only if it can: the name may have passed to an
    // element that is no control and has no tabIndex (a bar's root, a row
    // the Sheet closed into), so where focus didn't land, the Screen takes it.
    heir?.focus({ preventScroll: true });
    if (heir && document.activeElement === heir) return;
    if (screen?.isConnected) screen.focus({ preventScroll: true });
  };
}
