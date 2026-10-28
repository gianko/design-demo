import { tv } from "tailwind-variants/lite";

// Toast's tv() config, in a module of its own so the registry entry reads it
// without loading Toast.tsx and React: the generator loads entries under tsx
// on node. The toast is fixed to the window's bottom end corner (ADR 0013).
// `corner` is the fixed strip along the window's bottom, inset by the
// density's page padding and stacked at `z-toast`; it lets the pointer
// through, so only the toast takes it. The toast is the measure wide at the
// strip's end edge, or the strip's whole width where that is narrower, as on
// a phone. `vt-toast` is its view transition name, its alone: it slides in
// from the end edge and back out past it.
export const toast = tv({
  slots: {
    corner:
      "pointer-events-none fixed inset-x-0 bottom-0 z-toast flex px-page pb-page",
    root: "pointer-events-auto ms-auto flex w-full max-w-measure items-start gap-xs rounded-surface py-2xs ps-surface pe-2xs shadow-raised vt-toast",
    text: "flex min-h-control grow items-center text-body",
  },
  variants: {
    tone: {
      success: { root: "bg-surface-raised text-ink" },
      failure: { root: "bg-error text-error" },
    },
  },
});
