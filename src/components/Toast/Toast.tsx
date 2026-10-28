import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import type { PropsOf } from "../../registry/entry.ts";
import { IconButton } from "../IconButton/IconButton.tsx";
import { useAnnounce } from "../Screen/announce.ts";
import { keepingFocus } from "../Screen/focus.ts";
import { useStateEntry } from "../Screen/screen-state.tsx";
import { inViewTransition } from "../Screen/view-transition.ts";
import type { toastEntry } from "./Toast.registry.ts";
import { toast } from "./toast.ts";

// The live result of an action (ADR 0011, ADR 0013): a raised surface
// holding one sentence or two and a close button, shown in the state an
// action enters. It is fixed to the window's bottom end corner, out of the
// page flow, so where it sits in the tree moves nothing. Success is the
// raised surface; failure is the error pair, told apart at a glance while
// its copy says what happened. It slides in from the end edge with the
// state's View Transition and back out past it when it leaves
// (src/styles.css).
//
// Whether it shows is the library's own state, not a screen state: the
// screen stays in its state after the Toast leaves. Its close button
// dismisses it, and a success Toast dismisses itself after the `toast`
// duration token, its timer paused while the Toast is hovered, while focus
// is within it or while the tab is hidden. A failure Toast stays until it
// is closed or the next result replaces it. Each time its state is entered
// it shows again, even after it was closed or timed out, and its timer
// starts over. A Toast in the state its host starts in is a still render of
// that state, as a gate render or a Figma capture shows it, so its timer
// holds until the state is next entered.
//
// It is no live region itself: each time its state is entered it hands its
// copy to Screen's status region, as a live Text does.
// Its tv() config is toast.ts's, which the registry entry reads.

export type ToastProps = PropsOf<typeof toastEntry>;

// The `toast` duration token, in ms, as the page's CSS gives it on
// `element`; null where no stylesheet sets it, and then nothing times out.
function toastDuration(element: Element) {
  const value = getComputedStyle(element)
    .getPropertyValue("--ds-motion-duration-toast")
    .trim();
  const match = /^([\d.]+)(ms|s)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * (match[2] === "s" ? 1000 : 1);
}

// Whether the tab is hidden, as it changes.
function subscribeVisibility(changed: () => void) {
  document.addEventListener("visibilitychange", changed);
  return () => document.removeEventListener("visibilitychange", changed);
}
const tabHidden = () => document.visibilityState === "hidden";
const neverHidden = () => false;

export function Toast(props: ToastProps) {
  const announce = useAnnounce();
  const entry = useStateEntry();
  useEffect(() => {
    announce(props.text);
  }, [props.text, announce, entry]);
  // The entry it was dismissed in, so entering its state again shows it.
  const [closedAt, setClosedAt] = useState<number | null>(null);
  if (closedAt === entry) return null;
  // It leaves through a View Transition, so it slides out. If focus was on
  // its close button, it lands on the Screen (./focus.ts).
  const close = () =>
    void inViewTransition(
      keepingFocus(() => flushSync(() => setClosedAt(entry)))
    );
  // Keyed by the entry, so each entry shows a fresh Toast: its timer from
  // the start, and no hover or focus left over from the last.
  return (
    <ShownToast key={entry} {...props} timed={entry > 0} onClose={close} />
  );
}

function ShownToast({
  text: copy,
  tone,
  closeLabel,
  timed,
  onClose,
}: ToastProps & { timed: boolean; onClose: () => void }) {
  const slots = toast({ tone });
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    tabHidden,
    neverHidden
  );
  const close = useRef(onClose);
  close.current = onClose;

  // What is left of a success Toast's timer, read from the token once.
  const left = useRef<number | null | undefined>(undefined);
  const running =
    tone === "success" && timed && !hovered && !focused && !hidden;
  useEffect(() => {
    if (!running) return;
    left.current ??= toastDuration(ref.current!);
    const ms = left.current;
    if (ms === null) return;
    const started = Date.now();
    const timer = setTimeout(() => close.current(), ms);
    return () => {
      clearTimeout(timer);
      left.current = ms - (Date.now() - started);
    };
  }, [running]);

  return (
    <div className={slots.corner()}>
      <div
        ref={ref}
        data-component="Toast"
        data-tone={tone}
        className={slots.root()}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setFocused(false);
          }
        }}
      >
        <p className={slots.text()}>{copy}</p>
        <IconButton icon="close" label={closeLabel} onClick={onClose} />
      </div>
    </div>
  );
}
