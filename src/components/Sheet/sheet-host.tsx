import { createContext, useContext, type ReactNode } from "react";
import { flushSync } from "react-dom";

// The seam DataTable opens and closes a Sheet through (ADR 0011: DataTable
// owns the open sheet). Sheet holds no open state: DataTable renders the
// opened row's detail node inside a SheetHost, and the Sheet's close button
// and Escape ask the host to close it. With no host, as in Sheet's own
// stories, closing does nothing.

const noHost = () => {};

const SheetHostContext = createContext<() => void>(noHost);

export type SheetHostProps = {
  // Closes the sheet: DataTable runs it through transitionSheet.
  onClose: () => void;
  children?: ReactNode;
};

export function SheetHost({ onClose, children }: SheetHostProps) {
  return <SheetHostContext value={onClose}>{children}</SheetHostContext>;
}

// What the Sheet's close button and Escape call.
export function useSheetClose() {
  return useContext(SheetHostContext);
}

// The mark Sheet.css gives the sheet's view transition name, on whichever
// view shows the row and not the sheet, so the name is unique in each.
const origin = "data-sheet-origin";

// Opens or closes a sheet as ADR 0011's row → sheet: `update` is DataTable's
// state change, run inside a View Transition typed `sheet-open` or
// `sheet-close`, which Sheet.css times. `from` is the row's element: on open
// it carries the shared name in the old view, so the row expands into the
// sheet; on close in the new view, so the sheet shrinks back into it, and
// loses it once the transition ends. With no row, the sheet fades in or out
// on its own. Without View Transitions (jsdom) the update runs directly.
export function transitionSheet(
  direction: "open" | "close",
  from: Element | null,
  update: () => void
) {
  if (typeof document.startViewTransition !== "function") {
    flushSync(update);
    return;
  }
  if (direction === "open") from?.setAttribute(origin, "");
  const transition = document.startViewTransition({
    update: () => {
      if (direction === "open") from?.removeAttribute(origin);
      else from?.setAttribute(origin, "");
      flushSync(update);
    },
    types: [`sheet-${direction}`],
  });
  if (direction === "close") {
    void transition.finished.finally(() => from?.removeAttribute(origin));
  }
}
