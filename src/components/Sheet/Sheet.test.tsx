// Row detail (ADR 0011): DataTable renders the opened row's Sheet inside a
// SheetHost and closes it through the host, inside a View Transition that
// transitionSheet runs. jsdom has neither showModal nor View Transitions, so
// `document.startViewTransition` is stubbed as the browser's boundary: it
// records each transition's types and whether the row carried the shared
// name on either side of its update.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
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

// A stand-in for DataTable's side of the seam: a row that opens its Sheet,
// and the host that closes it, both through transitionSheet.
function OneRow() {
  const [open, setOpen] = useState(false);
  const row = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={row}
        onClick={(event) =>
          transitionSheet("open", event.currentTarget, () => setOpen(true))
        }
      >
        INV-0142 row
      </button>
      {open && (
        <SheetHost
          onClose={() =>
            transitionSheet("close", row.current, () => setOpen(false))
          }
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

it("opens and closes in View Transitions, the row carrying the shared name only in the view without the sheet", async () => {
  const seen = () => ({
    rowNamed: row().hasAttribute("data-sheet-origin"),
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
      before: { rowNamed: true, sheet: false },
      after: { rowNamed: false, sheet: true },
    },
    {
      types: ["sheet-close"],
      before: { rowNamed: false, sheet: true },
      after: { rowNamed: true, sheet: false },
    },
  ]);
  await Promise.all(finishing);
  expect(seen()).toEqual({ rowNamed: false, sheet: false });
});

it("does nothing on close with no host, as in its own stories", () => {
  render(<InvoiceSheet />);

  fireEvent.click(
    screen.getByRole("button", { name: "Close invoice details" })
  );
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

  expect(screen.getByRole("dialog", { name: "INV-0142" })).toBeTruthy();
});
