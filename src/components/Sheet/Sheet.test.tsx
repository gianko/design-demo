// Row detail (ADR 0011): DataTable renders the opened row's Sheet inside a
// SheetHost and closes it through the host, inside a View Transition that
// transitionSheet runs. jsdom has neither showModal nor View Transitions, so
// `document.startViewTransition` is stubbed as the browser's boundary: it
// records each transition's types and whether the row carried a view
// transition name on either side of its update. The Sheet slides in from the
// end edge and back out past it, on its own name, so the row never has one.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Heading } from "../Heading/Heading.tsx";
import { Text } from "../Text/Text.tsx";
import { SheetHost, transitionSheet } from "./sheet-host.tsx";
import { Sheet } from "./Sheet.tsx";

afterEach(() => {
  cleanup();
  delete (document as Partial<Document>).startViewTransition;
});

function InvoiceSheet() {
  return (
    <Sheet
      closeLabel="Close invoice details"
      title={<Heading text="INV-0142" level={2} />}
    >
      <Text text="Due Oct 24" />
    </Sheet>
  );
}

it("is a dialog named by its title", () => {
  render(<InvoiceSheet />);

  expect(screen.getByRole("dialog", { name: "INV-0142" })).toBeTruthy();
  // Its own view transition name, which slides it in and out (ADR 0011).
  expect(screen.getByRole("dialog").classList).toContain("vt-row-detail");
  expect(screen.getByText("Due Oct 24")).toBeTruthy();
});

it("asks its host to close it from its close button and on Escape", () => {
  const onClose = vi.fn();
  render(
    <SheetHost onClose={onClose}>
      <InvoiceSheet />
    </SheetHost>
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Close invoice details" })
  );
  expect(onClose).toHaveBeenCalledTimes(1);

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(2);
});

// The scrim is the modal dialog's ::backdrop, so a browser dispatches a press
// on it to the dialog itself, at a point outside the panel's box. jsdom lays
// nothing out, so the panel's box is stubbed: 420px wide at the end edge of a
// 1280 × 800 window.
type Point = { clientX: number; clientY: number };
const onScrim: Point = { clientX: 200, clientY: 400 };
const inPanel: Point = { clientX: 1000, clientY: 400 };

function laidOut(dialog: HTMLElement) {
  vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(
    new DOMRect(860, 0, 420, 800)
  );
  return dialog;
}

// A primary-button press as a browser dispatches it: pointerdown where it
// starts, pointerup where it ends, then a click on the nearest element that
// holds both, at the point it ends.
function press(from: [Element, Point], to: [Element, Point]) {
  fireEvent.pointerDown(from[0], { button: 0, ...from[1] });
  fireEvent.pointerUp(to[0], { button: 0, ...to[1] });
  let both: Element = from[0];
  while (!both.contains(to[0])) both = both.parentElement!;
  fireEvent.click(both, { button: 0, ...to[1] });
}

it("asks its host to close it when the scrim is clicked", () => {
  const onClose = vi.fn();
  render(
    <SheetHost onClose={onClose}>
      <InvoiceSheet />
    </SheetHost>
  );
  const dialog = laidOut(screen.getByRole("dialog"));

  press([dialog, onScrim], [dialog, onScrim]);

  expect(onClose).toHaveBeenCalledTimes(1);
});

it("stays open after a press that starts in the panel and ends on the scrim, or the other way", () => {
  const onClose = vi.fn();
  render(
    <SheetHost onClose={onClose}>
      <InvoiceSheet />
    </SheetHost>
  );
  const dialog = laidOut(screen.getByRole("dialog"));
  const body = screen.getByText("Due Oct 24");

  // Dragging out of a text selection in the body.
  press([body, inPanel], [dialog, onScrim]);
  press([dialog, onScrim], [body, inPanel]);

  expect(onClose).not.toHaveBeenCalled();
});

it("stays open after a click inside the panel", () => {
  const onClose = vi.fn();
  render(
    <SheetHost onClose={onClose}>
      <InvoiceSheet />
    </SheetHost>
  );
  const dialog = laidOut(screen.getByRole("dialog"));
  const title = screen.getByRole("heading", { name: "INV-0142" });
  const body = screen.getByText("Due Oct 24");

  press([title, inPanel], [title, inPanel]);
  press([body, inPanel], [body, inPanel]);
  // The panel's own padding, where the dialog itself is the target.
  press([dialog, inPanel], [dialog, inPanel]);
  // Text that overflows the panel's box is still the panel's.
  press([body, onScrim], [body, onScrim]);

  expect(onClose).not.toHaveBeenCalled();
});

// A stand-in for DataTable's side of the seam: a row that opens its Sheet,
// and the host that closes it, both through transitionSheet.
function OneRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => transitionSheet("open", () => setOpen(true))}>
        INV-0142 row
      </button>
      {open && (
        <SheetHost
          onClose={() => transitionSheet("close", () => setOpen(false))}
        >
          <InvoiceSheet />
        </SheetHost>
      )}
    </>
  );
}

const row = () => screen.getByRole("button", { name: "INV-0142 row" });

it("takes focus when it opens, and gives it back to the row when it closes", () => {
  render(<OneRow />);
  row().focus();

  fireEvent.click(row());
  expect(document.activeElement).toBe(screen.getByRole("dialog"));

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(row());
});

it("opens and closes in View Transitions, the row never sharing the sheet's name", async () => {
  const seen = () => ({
    rowNamed: [...row().classList].some((name) => name.startsWith("vt-")),
    sheet: screen.queryByRole("dialog") !== null,
  });
  const transitions: unknown[] = [];
  const finishing: Promise<void>[] = [];
  document.startViewTransition = ((options: StartViewTransitionOptions) => {
    const before = seen();
    options.update?.();
    transitions.push({
      types: [...(options.types ?? [])],
      before,
      after: seen(),
    });
    // The transition ends after this turn, as a browser's does.
    const finished = new Promise<void>((done) => setTimeout(done));
    finishing.push(finished);
    return {
      finished,
      ready: finished,
      updateCallbackDone: Promise.resolve(),
      skipTransition: () => {},
      types: new Set(options.types),
    };
  }) as Document["startViewTransition"];
  render(<OneRow />);

  fireEvent.click(row());
  fireEvent.click(
    screen.getByRole("button", { name: "Close invoice details" })
  );

  expect(transitions).toEqual([
    {
      types: ["sheet-open"],
      before: { rowNamed: false, sheet: false },
      after: { rowNamed: false, sheet: true },
    },
    {
      types: ["sheet-close"],
      before: { rowNamed: false, sheet: true },
      after: { rowNamed: false, sheet: false },
    },
  ]);
  await Promise.all(finishing);
  expect(seen()).toEqual({ rowNamed: false, sheet: false });
});

it("does nothing on close with no host, as in its own stories", () => {
  render(<InvoiceSheet />);
  const dialog = laidOut(screen.getByRole("dialog"));

  fireEvent.click(
    screen.getByRole("button", { name: "Close invoice details" })
  );
  fireEvent.keyDown(dialog, { key: "Escape" });
  press([dialog, onScrim], [dialog, onScrim]);

  expect(screen.getByRole("dialog", { name: "INV-0142" })).toBeTruthy();
});
