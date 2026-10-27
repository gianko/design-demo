import { useEffect } from "react";
import type { PropsOf } from "../../registry/entry.ts";
import { useInActionBar } from "../ActionBar/in-action-bar.ts";
import { useAnnounce } from "../Screen/announce.ts";
import { useStateEntry } from "../Screen/screen-state.tsx";
import type { toastEntry } from "./Toast.registry.ts";
import { toast } from "./toast.ts";

// The live result of an action (ADR 0011): a raised surface holding one
// sentence or two, shown in the state an action enters. It sits where
// ActionBar does, sticky at the end edge, and a one-line toast is the bar's
// height, so entering a success state morphs the bar into the toast through
// the view transition name both take from `vt-action-result`. A failure
// toast keeps a name of its own, as the bar stays: inside the bar, as its
// first row, when the state shows one (#243), and on its own when it shows
// none. Success is the bar's own surface; failure is the error pair, told
// apart at a glance while its copy says what happened. It is no live region
// itself: each time its state is entered it hands its copy to Screen's
// status region, as a live Text does.
// Its tv() config is toast.ts's, which the registry entry reads.

export type ToastProps = PropsOf<typeof toastEntry>;

export function Toast({ text: copy, tone }: ToastProps) {
  const slots = toast({ tone, inBar: useInActionBar() });
  const announce = useAnnounce();
  const entry = useStateEntry();
  useEffect(() => {
    announce(copy);
  }, [copy, announce, entry]);
  return (
    // Focusable from script only: when a confirmed result removes the bar's
    // focused Button, focus lands on the Toast the bar became (ADR 0011).
    <div
      data-component="Toast"
      data-tone={tone}
      tabIndex={-1}
      className={slots.root()}
    >
      <p className={slots.text()}>{copy}</p>
    </div>
  );
}
