import { tv } from "tailwind-variants/lite";

// Toast's tv() config, in a module of its own so the registry entry reads it
// without loading Toast.tsx and React: the generator loads entries under tsx
// on node. Each tone carries its view transition name (ADR 0011): a success
// Toast ActionBar's, so the bar becomes the toast, and a failure Toast one of
// its own, so it enters while the bar stays.
export const toast = tv({
  slots: {
    root: "sticky bottom-sm z-toast ms-auto flex w-fit max-w-measure items-center rounded-surface px-surface py-2xs shadow-raised",
    text: "flex min-h-control items-center text-body",
  },
  variants: {
    tone: {
      success: { root: "bg-surface-raised text-ink vt-action-result" },
      failure: { root: "bg-overdue text-overdue vt-action-failure" },
    },
  },
});
