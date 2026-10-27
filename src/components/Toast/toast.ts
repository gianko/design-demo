import { tv } from "tailwind-variants/lite";

// Toast's tv() config, in a module of its own so the registry entry reads it
// without loading Toast.tsx and React: the generator loads entries under tsx
// on node. Each tone carries its view transition name (ADR 0011): a success
// Toast ActionBar's, so the bar becomes the toast, and a failure Toast one of
// its own, so it enters while the bar stays. Focus can land on a Toast (the
// one a bar holding focus became), but it is no control, so it shows no
// focus ring. On its own a Toast floats as the bar does: sticky at the end
// edge, raised and stacked. Inside a bar (`inBar`, #243) it is the bar's
// first row, spanning it, and the bar is the one floating surface, so it
// neither sticks nor casts a shadow nor stacks on its own.
export const toast = tv({
  slots: {
    root: "flex max-w-measure items-center rounded-surface px-surface py-2xs outline-hidden",
    text: "flex min-h-control items-center text-body",
  },
  variants: {
    tone: {
      success: { root: "bg-surface-raised text-ink vt-action-result" },
      failure: { root: "bg-error text-error vt-action-failure" },
    },
    inBar: {
      false: { root: "sticky bottom-sm z-toast ms-auto w-fit shadow-raised" },
      true: {},
    },
  },
  defaultVariants: { inBar: false },
});
