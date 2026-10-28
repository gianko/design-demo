// The Selection (ADR 0011, #188): DataTable ticks rows, the ScreenHost holds
// which ones, and a generated screen reads them with useSelectedRows to pass
// to payInvoices. A confirmed action clears the selection and a failed one
// keeps it. jsdom has no View Transitions, so `document.startViewTransition`
// is stubbed as the browser's boundary: it records each transition's types
// and the selection either side of its update.

import { composeStory } from "@storybook/react-vite";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import preview from "../../../.storybook/preview.tsx";
import { DataTable, openDetailAttribute } from "./DataTable.tsx";
import * as stories from "./DataTable.stories.tsx";

// The selected count's three forms, as a UI spec writes them (ADR 0013).
const selectionText = {
  none: "No invoices selected",
  one: "1 invoice selected",
  other: "{count} invoices selected",
};

// invoice-queue as its generated screen wires it: Approve and pay acts on the
// Selection, so it sits in the table's actions footer, which makes the table
// selectable (ADR 0013).
function InvoiceQueue({ withActions = true }: { withActions?: boolean }) {
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
      <DataTable
        rows={data.invoices}
        columns={["Invoice"]}
        cell={(row) => <Text text={row.number} />}
        {...(withActions && {
          selectionText,
          actions: (
            <Button
              text="Approve and pay"
              intent="primary"
              pending={approveAndPay.pending}
              onClick={() => approveAndPay.run(selected)}
            />
          ),
        })}
      />
    </>
  );
}

function host(
  name = "default",
  fixture: VariantName = "default",
  withActions = true
) {
  render(
    <ScreenHost screenState={{ name, fixture }}>
      <InvoiceQueue withActions={withActions} />
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
const payButton = () =>
  screen.getByRole<HTMLButtonElement>("button", { name: "Approve and pay" });
const approveAndPay = () => fireEvent.click(payButton());
const boxes = () => screen.getAllByRole<HTMLInputElement>("checkbox");

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

// The actions footer (ADR 0013): the selected count at its start, in the UI
// spec's none, one and other forms, the library filling in `{count}`.
it("says how many rows are ticked in the footer, in the none, one and other forms", () => {
  host();
  expect(screen.getByText("No invoices selected")).toBeTruthy();

  tick("INV-0147");
  expect(screen.getByText("1 invoice selected")).toBeTruthy();

  tick("INV-0148");
  expect(screen.getByText("2 invoices selected")).toBeTruthy();

  fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
  expect(screen.getByText("8 invoices selected")).toBeTruthy();
  expect(screen.queryByText(/\{count\}/)).toBeNull();
});

it("disables the footer's Buttons while nothing is ticked, and enables them once a row is", () => {
  host();
  expect(payButton().disabled).toBe(true);

  tick("INV-0147");
  expect(payButton().disabled).toBe(false);

  tick("INV-0147");
  expect(payButton().disabled).toBe(true);
});

it("enables the footer's Buttons in a state that starts with rows ticked", () => {
  host("rows-selected", "invoice-queue/rows-selected");

  expect(screen.getByText("3 invoices selected")).toBeTruthy();
  expect(payButton().disabled).toBe(false);
});

// The selection locks while a footer action is pending (ADR 0013), so the
// rows the operation acts on are the rows shown ticked.
describe("while a footer action is pending", () => {
  const locked = () =>
    boxes().map((box) => [
      box.getAttribute("aria-disabled"),
      box.disabled,
    ]);

  it("locks every Checkbox, still focusable, and ticking does nothing", async () => {
    host();
    tick("INV-0147");
    approveAndPay();

    expect(locked()).toEqual(boxes().map(() => ["true", false]));
    tick("INV-0148");
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    tick("INV-0147");
    expect(selectedRows()).toBe("INV-0147");
    expect(ticked()).toEqual(["Select INV-0147"]);
    expect(screen.getByText("1 invoice selected")).toBeTruthy();
    const box = screen.getByRole("checkbox", { name: "Select INV-0148" });
    box.focus();
    expect(document.activeElement).toBe(box);
  });

  it("unlocks the selection once the action succeeds", async () => {
    host();
    tick("INV-0147");
    approveAndPay();
    await act(() => vi.advanceTimersByTimeAsync(1800));

    expect(locked()).toEqual(boxes().map(() => [null, false]));
    tick("INV-0148");
    expect(selectedRows()).toBe("INV-0148");
  });

  it("unlocks the selection once the action fails", async () => {
    host("rows-selected", "invoice-queue/payment-failed");
    approveAndPay();
    expect(locked()).toEqual(boxes().map(() => ["true", false]));
    await act(() => vi.advanceTimersByTimeAsync(1800));

    expect(screenState()).toBe("payment-failed");
    expect(locked()).toEqual(boxes().map(() => [null, false]));
    tick("INV-0147");
    expect(selectedRows()).toBe("INV-0148 INV-0149");
  });
});

// ADR 0013, Consequences: a confirmed result clears the selection, so the
// footer Button that had focus is disabled and can't hold it; focus moves to
// the table, next to what was acted on.
it("moves focus to the table when a confirmed result disables the footer Button that had focus", async () => {
  host();
  tick("INV-0147");
  payButton().focus();
  approveAndPay();
  await act(() => vi.advanceTimersByTimeAsync(1800));

  expect(screenState()).toBe("payment-scheduled");
  expect(payButton().disabled).toBe(true);
  expect(document.activeElement).toBe(screen.getByRole("table"));
});

it("leaves focus be when the footer's Buttons are disabled while focus is elsewhere", () => {
  host();
  tick("INV-0147");
  const box = screen.getByRole("checkbox", { name: "Select INV-0147" });
  box.focus();

  tick("INV-0147");

  expect(payButton().disabled).toBe(true);
  expect(document.activeElement).toBe(box);
});

it("keeps focus on the footer Button, back at rest, when the action fails", async () => {
  host("rows-selected", "invoice-queue/payment-failed");
  payButton().focus();
  approveAndPay();
  await act(() => vi.advanceTimersByTimeAsync(1800));

  expect(payButton().disabled).toBe(false);
  expect(document.activeElement).toBe(payButton());
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

// Selection is off unless an action acts on the Selection (#203): a table is
// selectable exactly when it has actions (ADR 0013).
it("renders no checkboxes and no footer, and never enters rows-selected, without actions", () => {
  host("default", "default", false);

  expect(screen.queryAllByRole("checkbox")).toEqual([]);
  expect(screen.queryAllByRole("button")).toEqual([]);
  const root = document.querySelector('[data-component="DataTable"]')!;
  expect(root.children).toHaveLength(1);
  fireEvent.click(screen.getByRole("cell", { name: "INV-0147" }));
  expect(screenState()).toBe("default");
  expect(selectedRows()).toBe("");
});

// Row → sheet (ADR 0011, #214): a table with a detail slot opens a row's own
// Sheet when the row is clicked or Enter is pressed on it, through a View
// Transition typed sheet-open. The open sheet is DataTable's own state, not
// a screen state, so the screen stays where it was.
function OverdueInvoices({ withActions }: { withActions: boolean }) {
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
        {...(withActions && {
          selectionText,
          actions: <Button text="Send reminders" intent="primary" />,
        })}
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

function hostWithDetail(withActions = false) {
  render(
    <ScreenHost screenState={{ name: "default", fixture: "default" }}>
      <OverdueInvoices withActions={withActions} />
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

it("in a table with actions, ticking a row selects it without opening it, and clicking the row opens it without selecting it", () => {
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
        <OverdueInvoices withActions={false} />
        <OverdueInvoices withActions={false} />
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

// The invoice Sheet in DataTable's own stories shows the row's amount and
// status, then only facts no column shows (#293). The story's open-sheet
// render opens the first row's Sheet, as the gate shoots it.
it("shows no column's fact in its invoice Sheet story but the amount and status", () => {
  const OpenSheet = composeStory(
    { ...stories.WithDetail, parameters: { openSheet: 0 } },
    stories.default,
    preview
  );
  render(<OpenSheet />);

  const table = document.querySelector('[data-component="DataTable"]')!;
  const sheet = screen.getByRole("dialog", { name: "INV-0142" });
  const columns = [...table.querySelectorAll("thead th")].map(
    (header) => header.textContent
  );
  const [cells] = [...table.querySelectorAll("tbody tr")].map((each) =>
    [...each.querySelectorAll("td")].map((cell) => cell.textContent)
  );
  // The body's facts: each element holding only text, the title left out.
  const facts = [...sheet.lastElementChild!.querySelectorAll("*")]
    .filter((each) => each.children.length === 0)
    .map((each) => each.textContent);

  const repeated = columns.filter(
    (column, at) =>
      column !== "Amount" && column !== "Status" && facts.includes(cells![at]!)
  );

  expect(repeated).toEqual([]);
  expect(facts).toEqual(
    expect.arrayContaining([
      "September design retainer",
      "Sep 8",
      "Northwind Logistics & Freight Holdings Ltd.",
      "2 lines",
    ])
  );
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
// table with actions stops offering a selection it can't make, and shows no
// footer: the footer shows while the table has rows (ADR 0013).
it("renders the header row alone, with Select all rows disabled and no footer, when a table with actions has no rows", () => {
  render(
    <ScreenHost>
      <DataTable
        rows={[] as { id: string }[]}
        columns={["Invoice", "Status"]}
        selectionText={selectionText}
        actions={<Button text="Approve and pay" intent="primary" />}
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
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByText("No invoices selected")).toBeNull();
});
