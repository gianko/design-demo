import { tv } from "tailwind-variants/lite";

// Toast's tv() config, in a module of its own so the registry entry reads it
// without loading Toast.tsx and React: the generator loads entries under tsx
// on node. Each tone carries a view transition name of its own (ADR 0011),
// so each enters on its own. Focus can land on a Toast from script, but it
// is no control, so it shows no focus ring. It floats: sticky at the end
// edge, raised and stacked.
export const toast = tv({
  slots: {
    root: "sticky bottom-sm z-toast ms-auto flex w-fit max-w-measure items-center rounded-surface px-surface py-2xs shadow-raised outline-hidden",
    text: "flex min-h-control items-center text-body",
  },
  variants: {
    tone: {
      success: { root: "bg-surface-raised text-ink vt-action-result" },
      failure: { root: "bg-error text-error vt-action-failure" },
    },
  },
});
