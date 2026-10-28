// The Selection (ADR 0011, #188): DataTable ticks rows, the ScreenHost holds
// which ones, and a generated screen reads them with useSelectedRows to pass
// to payInvoices. A confirmed action clears the selection and a failed one
// keeps it. jsdom has no View Transitions, so `document.startViewTransition`
// is stubbed as the browser's boundary: it records each transition's types
// and the selection either side of its update.

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { VariantName } from "../../fixtures/fixtures.ts";
import { Button } from "../Button/Button.tsx";
import {
  ScreenHost,
  useAction,
  useFixtureData,
  useScreenState,
  useSelectedRows,
} from "../Screen/screen-state.tsx";
import { Heading } from "../Heading/Heading.tsx";
import { Sheet } from "../Sheet/Sheet.tsx";
import { StatusTag } from "../StatusTag/StatusTag.tsx";
import { Text } from "../Text/Text.tsx";
import { DataTable, openDetailAttribute } from "./DataTable.tsx";

// invoice-queue as its generated screen wires it: its table is selectable,
// since Approve and pay acts on the Selection.
function InvoiceQueue({ selectable = true }: { selectable?: boolean }) {
  const data = useFixtureData();
  const { state } = useScreenState();
  const selected = useSelectedRows();
  const approveAndPay = useAction("payInvoices", {
    success: "payment-scheduled",
    failure: "payment-failed",
  });
  return (
    <>
      <output aria-label="Screen state">{state}</output>
      <output aria-label="Selected rows">{selected.join(" ")}</output>
      <Button
        text="Approve and pay"
        intent="primary"
        pending={approveAndPay.pending}
        onClick={() => approveAndPay.run(selected)}
      />
      <DataTable
        rows={data.invoices}
        columns={["Invoice"]}
        selectable={selectable}
        cell={(row) => <Text text={row.number} />}
      />
    </>
  );
}

function host(
  name = "default",
  fixture: VariantName = "default",
  selectable = true
) {
  render(
    <ScreenHost screenState={{ name, fixture }}>
      <InvoiceQueue selectable={selectable} />
    </ScreenHost>
  );
}

const shown = (label: string) =>
  screen.getByRole("status", { name: label }).textContent;
const screenState = () => shown("Screen state");
const selectedRows = () => shown("Selected rows");
const tick = (number: string) =>
  fireEvent.click(screen.getByRole("checkbox", { name: `Select ${number}` }));
const ticked = () =>
  screen
    .queryAllByRole("checkbox", { checked: true })
    .map((box) => box.closest("label")!.textContent);
const approveAndPay = () =>
  fireEvent.click(screen.getByRole("button", { name: "Approve and pay" }));

type Transition = { types: string[]; before: string; after: string };
let transitions: Transition[];

beforeEach(() => {
  vi.useFakeTimers();
  transitions = [];
  document.startViewTransition = ((options: StartViewTransitionOptions) => {
    const before = selectedRows() ?? "";
    options.update?.();
    transitions.push({
      types: [...(options.types ?? [])],
      before,
      after: selectedRows() ?? "",
    });
    const done = Promise.resolve();
    return {
      finished: done,
      ready: done,
      updateCallbackDone: done,
      skipTransition() {},
      types: new Set(options.types ?? []),
    } as unknown as ViewTransition;
  }) as Document["startViewTransition"];
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete (document as Partial<Document>).startViewTransition;
});

it("reads a ticked row's id through useSelectedRows, and none once it's unticked", () => {
  host();

  tick("INV-0147");
  expect(selectedRows()).toBe("INV-0147");
  expect(screenState()).toBe("rows-selected");

  tick("INV-0147");
  expect(selectedRows()).toBe("");
  expect(screenState()).toBe("default");
});

it("clears the selection inside the confirm View Transition when the action succeeds", async () => {
  host();
  tick("INV-0147");
  tick("INV-0148");

  approveAndPay();
  await act(() => vi.advanceTimersByTimeAsync(1800));

  expect(screenState()).toBe("payment-scheduled");
  expect(transitions.at(-1)).toEqual({
    types: ["confirm"],
    before: "INV-0147 INV-0148",
    after: "",
  });
  expect(ticked()).toEqual([]);
});

it("keeps the selection when the action fails", async () => {
  host("rows-selected", "invoice-queue/payment-failed");

  approveAndPay();
  await act(() => vi.advanceTimersByTimeAsync(1800));

  expect(screenState()).toBe("payment-failed");
  expect(transitions.at(-1)!.types).toEqual(["fail"]);
  expect(selectedRows()).toBe("INV-0147 INV-0148 INV-0149");
  expect(ticked()).toEqual([
    "Select INV-0147",
    "Select INV-0148",
    "Select INV-0149",
  ]);
});

it("returns to rows-selected when a row is ticked after a failure", async () => {
  host("rows-selected", "invoice-queue/payment-failed");
  approveAndPay();
  await act(() => vi.advanceTimersByTimeAsync(1800));

  tick("INV-0142");

  expect(screenState()).toBe("rows-selected");
  expect(selectedRows()).toBe("INV-0147 INV-0148 INV-0149 INV-0142");
});

it("starts with the awaiting invoices selected in invoice-queue/rows-selected", () => {
  host("rows-selected", "invoice-queue/rows-selected");

  expect(selectedRows()).toBe("INV-0147 INV-0148 INV-0149");
  expect(ticked()).toEqual([
    "Select INV-0147",
    "Select INV-0148",
    "Select INV-0149",
  ]);
});

// Selection is off unless an action acts on the Selection (#203).
it("renders no checkboxes and never enters rows-selected when selectable is left out", () => {
  host("default", "default", false);

  expect(screen.queryAllByRole("checkbox")).toEqual([]);
  fireEvent.click(screen.getByRole("cell", { name: "INV-0147" }));
  expect(screenState()).toBe("default");
  expect(selectedRows()).toBe("");
});

// Row → sheet (ADR 0011, #214): a table with a detail slot opens a row's own
// Sheet when the row is clicked or Enter is pressed on it, through a View
// Transition typed sheet-open. The open sheet is DataTable's own state, not
// a screen state, so the screen stays where it was.
function OverdueInvoices({ selectable }: { selectable: boolean }) {
  const data = useFixtureData();
  const { state } = useScreenState();
  const selected = useSelectedRows();
  return (
    <>
      <output aria-label="Screen state">{state}</output>
      <output aria-label="Selected rows">{selected.join(" ")}</output>
      <DataTable
        rows={data.invoices}
        columns={["Invoice"]}
        selectable={selectable}
        cell={(row) => <Text text={row.number} />}
        detail={(row) => (
          <Sheet
            closeLabel="Close invoice details"
            title={<Heading level={2} text={row.number} />}
          >
            <Text text={row.contractor} />
          </Sheet>
        )}
      />
    </>
  );
}

function hostWithDetail(selectable = false) {
  render(
    <ScreenHost screenState={{ name: "default", fixture: "default" }}>
      <OverdueInvoices selectable={selectable} />
    </ScreenHost>
  );
}

const row = (number: string) =>
  screen.getByRole("cell", { name: number }).closest("tr")!;
const openSheet = () => screen.queryByRole("dialog");
const types = () => transitions.map((each) => each.types);

it("opens a row's Sheet when the row is clicked, through a sheet-open View Transition", () => {
  hostWithDetail();

  fireEvent.click(row("INV-0148"));

  expect(openSheet()).toBe(screen.getByRole("dialog", { name: "INV-0148" }));
  expect(types()).toEqual([["sheet-open"]]);
  expect(screenState()).toBe("default");
});

it("opens a row's Sheet when Enter is pressed on the row", () => {
  hostWithDetail();
  const invoice = row("INV-0145");

  invoice.focus();
  expect(document.activeElement).toBe(invoice);
  fireEvent.keyDown(invoice, { key: "Enter" });

  expect(openSheet()).toBe(screen.getByRole("dialog", { name: "INV-0145" }));
  expect(types()).toEqual([["sheet-open"]]);
});

it("closes the Sheet on Escape or its close button, through a sheet-close View Transition, and focus goes back to the row", () => {
  hostWithDetail();
  const invoice = row("INV-0145");
  invoice.focus();
  fireEvent.keyDown(invoice, { key: "Enter" });

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(openSheet()).toBeNull();
  expect(document.activeElement).toBe(invoice);

  fireEvent.click(invoice);
  fireEvent.click(
    screen.getByRole("button", { name: "Close invoice details" })
  );
  expect(openSheet()).toBeNull();
  expect(types()).toEqual([
    ["sheet-open"],
    ["sheet-close"],
    ["sheet-open"],
    ["sheet-close"],
  ]);
});

it("closes the Sheet on a click on the scrim, through a sheet-close View Transition, and focus goes back to the row", () => {
  hostWithDetail();
  const invoice = row("INV-0145");
  invoice.focus();
  fireEvent.keyDown(invoice, { key: "Enter" });
  // The scrim is the dialog's ::backdrop: a browser dispatches a press on it
  // to the dialog, outside the panel's box, which jsdom doesn't lay out.
  const dialog = screen.getByRole("dialog");
  vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(
    new DOMRect(860, 0, 420, 800)
  );

  fireEvent.pointerDown(dialog, { clientX: 200, clientY: 400 });
  fireEvent.pointerUp(dialog, { clientX: 200, clientY: 400 });
  fireEvent.click(dialog, { clientX: 200, clientY: 400 });

  expect(openSheet()).toBeNull();
  expect(types()).toEqual([["sheet-open"], ["sheet-close"]]);
  expect(document.activeElement).toBe(invoice);
});

it("in a selectable table, ticking a row selects it without opening it, and clicking the row opens it without selecting it", () => {
  hostWithDetail(true);

  tick("INV-0147");
  expect(openSheet()).toBeNull();
  expect(selectedRows()).toBe("INV-0147");
  expect(screenState()).toBe("rows-selected");

  fireEvent.keyDown(screen.getByRole("checkbox", { name: "Select INV-0148" }), {
    key: "Enter",
  });
  expect(openSheet()).toBeNull();

  fireEvent.click(row("INV-0148"));
  expect(openSheet()).toBe(screen.getByRole("dialog", { name: "INV-0148" }));
  expect(selectedRows()).toBe("INV-0147");
  expect(screenState()).toBe("rows-selected");
});

it("renders the Sheet after the table's surface, not inside it", () => {
  hostWithDetail();

  fireEvent.click(row("INV-0148"));

  const table = document.querySelector('[data-component="DataTable"]')!;
  expect(table.contains(openSheet())).toBe(false);
  expect(table.nextElementSibling).toBe(openSheet());
});

// The open-sheet render (ADR 0011, #215): a library test attribute on an
// element around the screen names one of the tables with a detail slot
// inside it, counted from 0 in document order, and that table starts with
// its first row's Sheet open, with no View Transition, so the gate's shot
// catches no motion. A table without a detail slot doesn't count.
it("starts with the first row's Sheet open in the table the test attribute names, with no View Transition", () => {
  render(
    <ScreenHost>
      <div {...{ [openDetailAttribute]: "1" }}>
        <DataTable
          rows={[{ id: "PLAIN" }]}
          columns={["Plain"]}
          cell={(row) => <Text text={row.id} />}
        />
        <OverdueInvoices selectable={false} />
        <OverdueInvoices selectable={false} />
      </div>
    </ScreenHost>
  );

  const sheets = screen.getAllByRole("dialog");
  expect(sheets).toEqual([screen.getByRole("dialog", { name: "INV-0142" })]);
  const tables = document.querySelectorAll('[data-component="DataTable"]');
  expect(tables[2]!.nextElementSibling).toBe(sheets[0]);
  expect(types()).toEqual([]);
});

it("opens no Sheet from the start without the test attribute", () => {
  hostWithDetail();

  expect(openSheet()).toBeNull();
});

it("leaves rows out of the tab order, and opens nothing, with no detail slot", () => {
  host("default", "default", false);

  fireEvent.click(row("INV-0148"));

  expect(openSheet()).toBeNull();
  expect(row("INV-0148").tabIndex).toBe(-1);
});

// A Status column keeps room for every status word (#276), but a screen
// reader hears only the word each cell's tag shows.
it("reads only a status cell's own word, not the words its column keeps room for", () => {
  render(
    <ScreenHost>
      <DataTable
        rows={[
          { id: "INV-0147", status: "awaiting" as const },
          { id: "INV-0145", status: "scheduled" as const },
        ]}
        columns={["Invoice", "Status"]}
        cell={(row) => (
          <>
            <Text text={row.id} />
            <StatusTag status={row.status} />
          </>
        )}
      />
    </ScreenHost>
  );

  expect(screen.getByRole("row", { name: "INV-0147 Awaiting" })).toBeTruthy();
  expect(screen.getByRole("row", { name: "INV-0145 Scheduled" })).toBeTruthy();
});

// A list with no rows: a screen shows an EmptyState in the DataTable's place
// (#290), but the table itself still renders its header row, and a
// selectable one stops offering a selection it can't make.
it("renders the header row alone, with Select all rows disabled, when a selectable table has no rows", () => {
  render(
    <ScreenHost>
      <DataTable
        rows={[] as { id: string }[]}
        columns={["Invoice", "Status"]}
        selectable
        cell={(row) => <Text text={row.id} />}
      />
    </ScreenHost>
  );

  expect(screen.getAllByRole("row")).toEqual([
    screen.getByRole("row", { name: "Select all rows Invoice Status" }),
  ]);
  expect(
    screen.getByRole<HTMLInputElement>("checkbox", { name: "Select all rows" })
      .disabled
  ).toBe(true);
});
