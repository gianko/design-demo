// The pay confirmation's result (ADR 0011, ADR 0013): a Toast shows in the
// state an action enters and is that state's announcement through Screen's
// one status region. The action's Button is in the table's actions footer;
// a confirmed payment shows the success Toast and a failed one the failure
// Toast, each last in the Screen. jsdom has no View Transitions, so
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
import { Screen } from "../Screen/Screen.tsx";
import {
  ScreenHost,
  useAction,
  useFixtureData,
  useScreenState,
  useSelectedRows,
} from "../Screen/screen-state.tsx";
import { Text } from "../Text/Text.tsx";
import { Toast } from "./Toast.tsx";

const scheduled = "3 invoices scheduled for the Oct 24 run.";
const failed =
  "Payment not scheduled: the funding account is too low. Add funds, then approve and pay again.";

// bulk-pay as its generated screen wires it: Approve and pay in the table's
// footer, and the success or the failure Toast last in the Screen, in the
// state the payment enters.
function BulkPay() {
  const data = useFixtureData();
  const { state } = useScreenState();
  const selected = useSelectedRows();
  const pay = useAction("payInvoices", {
    success: "payment-scheduled",
    failure: "payment-failed",
  });
  return (
    <Screen audience="admin">
      <DataTable
        rows={data.payQueue}
        columns={["Invoice"]}
        cell={(row) => <Text text={row.number} />}
        selectionText={{
          none: "No invoices selected",
          one: "1 invoice selected",
          other: "{count} invoices selected",
        }}
        actions={
          <Button
            text="Approve and pay"
            intent="primary"
            pending={pay.pending}
            onClick={() => pay.run(selected)}
          />
        }
      />
      {state === "payment-scheduled" && (
        <Toast tone="success" text={scheduled} />
      )}
      {state === "payment-failed" && <Toast tone="failure" text={failed} />}
    </Screen>
  );
}

// The default state with the awaiting invoices ticked, its operations
// settling under `fixture`.
function host(fixture: VariantName) {
  render(
    <ScreenHost
      screenState={{ name: "default", fixture }}
      selected={["INV-0147", "INV-0148", "INV-0149"]}
    >
      <BulkPay />
    </ScreenHost>
  );
}

const region = () => screen.getByRole("status");
const toast = () =>
  document.querySelector<HTMLElement>('[data-component="Toast"]');
const button = () =>
  screen.getByRole<HTMLButtonElement>("button", { name: "Approve and pay" });
const pay = async () => {
  fireEvent.click(button());
  await act(() => vi.advanceTimersByTimeAsync(1800));
};

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

it("shows the success Toast last in the Screen once the payment is confirmed, and announces it", async () => {
  host("default");
  expect(toast()).toBeNull();
  expect(region().textContent).toBe("");

  await pay();

  expect(transitions.at(-1)).toEqual(["confirm"]);
  expect(toast()!.textContent).toBe(scheduled);
  expect(toast()!.dataset.tone).toBe("success");
  expect(region().textContent).toBe(scheduled);
});

it("shows the failure Toast once the payment fails, the rows still ticked, and announces it", async () => {
  host("invoice-queue/payment-failed");

  await pay();

  expect(transitions.at(-1)).toEqual(["fail"]);
  expect(toast()!.textContent).toBe(failed);
  expect(toast()!.dataset.tone).toBe("failure");
  expect(screen.getByText("3 invoices selected")).toBeTruthy();
  expect(region().textContent).toBe(failed);
});

// A screen reader announces what is added to a live region, so a retry that
// fails again must add the copy again rather than leave it as it was.
it("announces the failure again when a retry fails again", async () => {
  host("invoice-queue/payment-failed");
  const added: string[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) added.push(node.textContent ?? "");
    }
  });
  observer.observe(region(), { childList: true, subtree: true });

  await pay();
  await pay();
  observer.disconnect();

  expect(transitions).toEqual([["fail"], ["fail"]]);
  expect(added).toEqual([failed, failed]);
});

// ADR 0013, Consequences: focus goes to the table, next to what was acted
// on, not into the Toast.
it("leaves focus on the table, not the Toast, once a payment from the footer is confirmed", async () => {
  host("default");
  button().focus();

  await pay();

  expect(document.activeElement).toBe(screen.getByRole("table"));
  // Focusable from script only, so it never joins the tab order.
  expect(toast()!.tabIndex).toBe(-1);
});
