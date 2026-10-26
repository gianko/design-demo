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
import { Text } from "../Text/Text.tsx";
import { DataTable } from "./DataTable.tsx";

// invoice-queue as its generated screen wires it.
function InvoiceQueue() {
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
        cell={(row) => <Text text={row.number} />}
      />
    </>
  );
}

function host(name = "default", fixture: VariantName = "default") {
  render(
    <ScreenHost screenState={{ name, fixture }}>
      <InvoiceQueue />
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
