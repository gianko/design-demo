// The pay confirmation's bar (ADR 0011): an ActionBar shown while rows are
// selected holds the action's Button. A confirmed payment clears the
// Selection and leaves the bar out, so the success state's Toast takes its
// place; a failed one keeps the bar, its Button back at rest, and the rows
// still selected for a retry. jsdom has no View Transitions, so
// `document.startViewTransition` is stubbed as the browser's boundary: it
// runs the update and records each transition's types.

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
import { DataTable } from "../DataTable/DataTable.tsx";
import {
  ScreenHost,
  useAction,
  useFixtureData,
  useScreenState,
  useSelectedRows,
} from "../Screen/screen-state.tsx";
import { Text } from "../Text/Text.tsx";
import { Toast } from "../Toast/Toast.tsx";
import { ActionBar } from "./ActionBar.tsx";

// bulk-pay as its generated screen wires it: the bar shows in rows-selected
// and in the failure state, which keeps the selection.
function BulkPay() {
  const data = useFixtureData();
  const { state } = useScreenState();
  const selected = useSelectedRows();
  const pay = useAction("payInvoices", {
    success: "payment-scheduled",
    failure: "payment-failed",
  });
  return (
    <>
      <output aria-label="Screen state">{state}</output>
      {/* Only a table with actions is selectable (ADR 0013): until the bar
          goes (#298), its footer holds a second action. */}
      <DataTable
        rows={data.invoices}
        columns={["Invoice"]}
        selectionText={{
          none: "No invoices selected",
          one: "1 invoice selected",
          other: "{count} invoices selected",
        }}
        cell={(row) => <Text text={row.number} />}
        actions={<Button text="Send reminders" intent="secondary" />}
      />
      {(state === "rows-selected" || state === "payment-failed") && (
        <ActionBar>
          <Button
            text="Approve and pay"
            intent="primary"
            pending={pay.pending}
            onClick={() => pay.run(selected)}
          />
        </ActionBar>
      )}
    </>
  );
}

function host(name = "default", fixture: VariantName = "default") {
  render(
    <ScreenHost screenState={{ name, fixture }}>
      <BulkPay />
    </ScreenHost>
  );
}

const screenState = () =>
  screen.getByRole("status", { name: "Screen state" }).textContent;
const bar = () => document.querySelector('[data-component="ActionBar"]');
const tick = (number: string) =>
  fireEvent.click(screen.getByRole("checkbox", { name: `Select ${number}` }));
const ticked = () =>
  screen
    .queryAllByRole("checkbox", { checked: true })
    .map((box) => box.closest("label")!.textContent);
const payButton = () => screen.getByRole("button", { name: "Approve and pay" });

let transitions: string[][];

beforeEach(() => {
  vi.useFakeTimers();
  transitions = [];
  document.startViewTransition = ((options: StartViewTransitionOptions) => {
    options.update?.();
    transitions.push([...(options.types ?? [])]);
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

it("shows the bar, holding its Button, once a row is ticked, and leaves it out once none is", () => {
  host();
  expect(bar()).toBeNull();

  tick("INV-0147");
  expect(screenState()).toBe("rows-selected");
  expect(bar()!.contains(payButton())).toBe(true);

  tick("INV-0147");
  expect(screenState()).toBe("default");
  expect(bar()).toBeNull();
});

it("leaves the bar out and clears the selection when the payment is confirmed", async () => {
  host("rows-selected", "invoice-queue/rows-selected");

  fireEvent.click(payButton());
  await act(() => vi.advanceTimersByTimeAsync(1800));

  expect(screenState()).toBe("payment-scheduled");
  expect(transitions.at(-1)).toEqual(["confirm"]);
  expect(bar()).toBeNull();
  expect(ticked()).toEqual([]);
});

it("keeps the bar, its Button back at rest, and the rows selected when the payment fails", async () => {
  host("rows-selected", "invoice-queue/payment-failed");

  fireEvent.click(payButton());
  expect(payButton().getAttribute("aria-busy")).toBe("true");
  await act(() => vi.advanceTimersByTimeAsync(1800));

  expect(screenState()).toBe("payment-failed");
  expect(transitions.at(-1)).toEqual(["fail"]);
  expect(bar()!.contains(payButton())).toBe(true);
  expect(payButton().getAttribute("aria-busy")).toBeNull();
  expect(ticked()).toEqual([
    "Select INV-0147",
    "Select INV-0148",
    "Select INV-0149",
  ]);
});

// A failure Toast in the bar is its first row, above a row of its Buttons
// (#243), wherever the screen puts it among them, fragments included.
it("puts a Toast it holds in a row of its own, before the row of its Buttons", () => {
  render(
    <ActionBar>
      <>
        <Button text="Send reminders" intent="secondary" />
        <Toast tone="failure" text="Reminders not sent." />
      </>
      <Button text="Approve and pay" intent="primary" />
    </ActionBar>
  );

  const [first, second, ...rest] = [...bar()!.children];
  expect(rest).toEqual([]);
  expect(first!.getAttribute("data-component")).toBe("Toast");
  expect([...second!.children].map((each) => each.textContent?.trim())).toEqual(
    ["Send reminders", "Approve and pay"]
  );
});
