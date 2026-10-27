// Every change the library animates runs through here (ADR 0011): `update`
// inside a View Transition with these types, or, where the browser has none
// (jsdom), on its own. Resolves once the transition has finished, or at once
// without one.
export function inViewTransition(
  update: () => void,
  types: readonly string[] = []
): Promise<void> {
  if (typeof document.startViewTransition !== "function") {
    update();
    return Promise.resolve();
  }
  return document
    .startViewTransition({ update, types: [...types] })
    .finished.catch(() => undefined);
}
