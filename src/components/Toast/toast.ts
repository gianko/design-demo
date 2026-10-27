import { tv } from "tailwind-variants/lite";

// Toast's tv() config, in a module of its own so the registry entry reads it
// without loading Toast.tsx, which imports Toast.css: the generator loads
// entries under tsx on node, which can't import a stylesheet.
export const toast = tv({
  slots: {
    root: "sticky bottom-sm z-toast ms-auto flex w-fit max-w-measure items-center rounded-surface px-surface py-2xs shadow-raised",
    text: "flex min-h-control items-center text-body",
  },
  variants: {
    tone: {
      success: { root: "bg-surface-raised text-ink" },
      failure: { root: "bg-overdue text-overdue" },
    },
  },
});
