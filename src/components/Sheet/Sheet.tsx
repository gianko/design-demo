import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import { IconButton } from "../IconButton/IconButton.tsx";
import type { sheetEntry } from "./Sheet.registry.ts";
import { useSheetClose } from "./sheet-host.tsx";

// Row detail (ADR 0011): an overlay panel at the end edge, full height, over
// the scrim, holding one row's facts. It is a native modal <dialog>, opened
// on mount: DataTable renders only the opened row's Sheet, so a rendered
// Sheet is an open one. The panel is the overlay surface, lighter in dark
// than the raised bars and toasts, and casts the overlay shadow, with no
// border; its corners facing the page take the surface radius, and the edge
// against the window stays square. Its title box names the dialog and is at
// least one control tall, so a one-line title centres on the close button.
// `vt-row-detail` is the view transition name it shares with the row it
// opened from.
export const sheet = tv({
  slots: {
    root: "ms-auto flex h-full max-h-none w-sheet max-w-full flex-col gap-lg rounded-s-surface bg-surface-overlay p-surface text-ink shadow-overlay outline-hidden backdrop:bg-scrim vt-row-detail",
    header: "flex items-start gap-sm",
    title: "flex min-h-control grow items-center",
    body: "flex min-h-0 flex-col gap-md overflow-y-auto",
  },
});

export type SheetProps = PropsOf<typeof sheetEntry> & {
  title?: ReactNode;
  children?: ReactNode;
};

export function Sheet({ closeLabel, title, children }: SheetProps) {
  const slots = sheet();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const close = useSheetClose();

  // In the commit, not after it, so the sheet is open by the time anything
  // reads the page: a View Transition's new view, a story's play function.
  useLayoutEffect(() => {
    const dialog = ref.current!;
    // What had focus when it opened: the row, which a keyboard user opened
    // with Enter. Focus goes back there when the sheet closes, as Radix's
    // onCloseAutoFocus would (ADR 0006).
    const opener = document.activeElement;
    // jsdom has no showModal or close; there the dialog is only marked open.
    const modal = typeof dialog.showModal === "function";
    if (!modal) dialog.open = true;
    else if (!dialog.open) dialog.showModal();
    // The dialog takes focus itself, so a screen reader starts at its name
    // and the first Tab reaches the close button.
    dialog.focus({ preventScroll: true });
    return () => {
      if (!modal) dialog.open = false;
      else if (dialog.open) dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog
      ref={ref}
      data-component="Sheet"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={slots.root()}
      // Escape is a close request the host carries out, through its View
      // Transition; handled on keydown, so the dialog never closes itself.
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        close();
      }}
      // Any other close request (a platform back gesture) goes the same way.
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className={slots.header()}>
        <div id={titleId} className={slots.title()}>
          {title}
        </div>
        <IconButton icon="close" label={closeLabel} onClick={close} />
      </div>
      <div className={slots.body()}>{children}</div>
    </dialog>
  );
}
