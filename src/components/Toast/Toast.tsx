import { useEffect } from "react";
import type { PropsOf } from "../../registry/entry.ts";
import { useAnnounce } from "../Screen/announce.ts";
import { useStateEntry } from "../Screen/screen-state.tsx";
import type { toastEntry } from "./Toast.registry.ts";
import { toast } from "./toast.ts";

// The live result of an action (ADR 0011, ADR 0013): a raised surface
// holding one sentence or two, shown in the state an action enters, last in
// its Screen. It floats, sticky at the end edge. Success is the raised
// surface; failure is the error pair, told apart at a glance while its copy
// says what happened. Each tone enters under a view transition name of its
// own. It is no live region itself: each time its state is entered it hands
// its copy to Screen's status region, as a live Text does.
// Its tv() config is toast.ts's, which the registry entry reads.

export type ToastProps = PropsOf<typeof toastEntry>;

export function Toast({ text: copy, tone }: ToastProps) {
  const slots = toast({ tone });
  const announce = useAnnounce();
  const entry = useStateEntry();
  useEffect(() => {
    announce(copy);
  }, [copy, announce, entry]);
  return (
    // Focusable from script only, so it never joins the tab order.
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
