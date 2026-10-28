import { createContext, useContext, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { inViewTransition } from "../Screen/view-transition.ts";

// The seam DataTable opens and closes a Sheet through (ADR 0011: DataTable
// owns the open sheet). Sheet holds no open state: DataTable renders the
// opened row's detail node inside a SheetHost, and the Sheet's close button,
// Escape and a click on the scrim ask the host to close it. With no host, as
// in Sheet's own stories, closing does nothing.

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

// What the Sheet's close button, Escape and a scrim click call.
export function useSheetClose() {
  return useContext(SheetHostContext);
}

// Opens or closes a sheet as ADR 0011's row → sheet: `update` is DataTable's
// state change, run inside a View Transition typed `sheet-open` or
// `sheet-close`, which src/styles.css times. The Sheet carries its own view
// transition name and the row none, so the sheet slides in from the end edge
// and back out past it, and the scrim fades with the page. Without View
// Transitions (jsdom) the update runs directly.
export function transitionSheet(
  direction: "open" | "close",
  update: () => void
) {
  void inViewTransition(() => flushSync(update), [`sheet-${direction}`]);
}
