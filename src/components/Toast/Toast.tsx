import { useEffect } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import { useAnnounce } from "../Screen/announce.ts";
import { useStateEntry } from "../Screen/screen-state.tsx";
import type { toastEntry } from "./Toast.registry.ts";

// The live result of an action (ADR 0011): a raised surface holding one
// sentence or two, shown in the state an action enters. It sits where
// ActionBar does, sticky at the end edge, and a one-line toast is the bar's
// height, so entering a success state morphs the bar into the toast through
// the view transition name Toast.css gives both. A failure toast keeps a name
// of its own, as the bar it sits beside stays. Success is the bar's own
// surface; failure is the overdue tint, told apart at a glance while its copy
// says what happened. It is no live region itself: each time its state is
// entered it hands its copy to Screen's status region, as a live Text does.
// Toast.css is imported by the barrel, not here: the registry entry reads
// this tv() config, and the generator loads entries under node, which can't
// import a stylesheet.
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

export type ToastProps = PropsOf<typeof toastEntry>;

export function Toast({ text: copy, tone }: ToastProps) {
  const slots = toast({ tone });
  const announce = useAnnounce();
  const entry = useStateEntry();
  useEffect(() => {
    announce(copy);
  }, [copy, announce, entry]);
  return (
    <div data-component="Toast" data-tone={tone} className={slots.root()}>
      <p className={slots.text()}>{copy}</p>
    </div>
  );
}
