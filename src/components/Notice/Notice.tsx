import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useEffect } from "react";
import type { PropsOf } from "../../registry/entry.ts";
import { useAnnounce } from "../Screen/announce.ts";
import { useStateEntry } from "../Screen/screen-state.tsx";
import { notice } from "./notice.ts";
import type { noticeEntry } from "./Notice.registry.ts";

// An action's result on the Card that holds the action's Button (ADR 0016):
// a Phosphor glyph and the result's copy, painted as a strip along the
// Card's bottom edge from Card's `result` slot. Success is the raised
// surface with ink, failure the inline error pair; the copy still says what
// happened, so colour never carries it alone. It has no close button and no
// timer: it leaves only when a state change drops it. A tone change (a
// retry that succeeds) swaps colours and glyph on the same element.
//
// It is no live region itself: each time its state is entered it hands its
// copy to Screen's status region, as Toast does, politely, never as an
// alert. It is focusable from script only, so focus lands on it when the
// state that shows it removes the focused Button (Screen's ./focus.ts).
// Its tv() config is notice.ts's, which the registry entry reads.

export type NoticeProps = PropsOf<typeof noticeEntry>;

// The glyphs, Phosphor regular. Not the shared icon map
// (IconButton/icons.tsx): its names are IconButton's `icon` options.
const glyphs = { success: CheckCircleIcon, failure: WarningCircleIcon };

export function Notice({ text: copy, tone }: NoticeProps) {
  const slots = notice({ tone });
  const announce = useAnnounce();
  const entry = useStateEntry();
  useEffect(() => {
    announce(copy);
  }, [copy, announce, entry]);
  const Glyph = glyphs[tone];
  return (
    <div
      data-component="Notice"
      data-tone={tone}
      // Focusable from script only (ADR 0016).
      tabIndex={-1}
      className={slots.root()}
    >
      <span aria-hidden className={slots.icon()}>
        <Glyph weight="regular" className={slots.glyph()} />
      </span>
      <p className={slots.text()}>{copy}</p>
    </div>
  );
}
