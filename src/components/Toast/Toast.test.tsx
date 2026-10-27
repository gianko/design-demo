// The pay confirmation's result (ADR 0011): a Toast shows in the state an
// action enters and is that state's announcement through Screen's one status
// region. A confirmed payment's success Toast takes the ActionBar's place; a
// failed one's failure Toast enters beside the bar, which stays. jsdom has no
// View Transitions, so `document.startViewTransition` is stubbed as the
// browser's boundary: it runs the update and records each transition's types.

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VariantName } from "../../fixtures/fixtures.ts";
import { ActionBar } from "../ActionBar/ActionBar.tsx";
import { Button } from "../Button/Button.tsx";
import { Screen } from "../Screen/Screen.tsx";
import {
  ScreenHost,
  useAction,
  useScreenState,
  useSelectedRows,
} from "../Screen/screen-state.tsx";
import { Text } from "../Text/Text.tsx";
import { Toast } from "./Toast.tsx";

const scheduled = "3 invoices scheduled for the Oct 24 run.";
const failed =
  "Payment not scheduled: the funding account is too low. Add funds, then approve and pay again.";

// bulk-pay as its generated screen wires it: the bar in rows-selected and in
// the failure state, a success Toast where the bar was, and a failure Toast
// right before the bar.
function BulkPay() {
  const { state } = useScreenState();
  const selected = useSelectedRows();
  const pay = useAction("payInvoices", {
    success: "payment-scheduled",
    failure: "payment-failed",
  });
  return (
    <Screen audience="admin">
      <Text text="Invoices awaiting approval." />
      {state === "payment-scheduled" && (
        <Toast tone="success" text={scheduled} />
      )}
      {state === "payment-failed" && <Toast tone="failure" text={failed} />}
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
    </Screen>
  );
}

function host(fixture: VariantName) {
  render(
    <ScreenHost screenState={{ name: "rows-selected", fixture }}>
      <BulkPay />
    </ScreenHost>
  );
}

const region = () => screen.getByRole("status");
const bar = () => document.querySelector('[data-component="ActionBar"]');
const toast = () =>
  document.querySelector<HTMLElement>('[data-component="Toast"]');
const pay = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Approve and pay" }));
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

it("shows the success Toast in the bar's place once the payment is confirmed, and announces it", async () => {
  host("invoice-queue/rows-selected");
  expect(toast()).toBeNull();
  expect(region().textContent).toBe("");

  await pay();

  expect(transitions.at(-1)).toEqual(["confirm"]);
  expect(bar()).toBeNull();
  expect(toast()!.textContent).toBe(scheduled);
  expect(toast()!.dataset.tone).toBe("success");
  expect(region().textContent).toBe(scheduled);
});

it("enters the failure Toast beside the bar, which stays, once the payment fails, and announces it", async () => {
  host("invoice-queue/payment-failed");

  await pay();

  expect(transitions.at(-1)).toEqual(["fail"]);
  expect(bar()).not.toBeNull();
  expect(toast()!.textContent).toBe(failed);
  expect(toast()!.dataset.tone).toBe("failure");
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

// Focus follows the view transition name (ADR 0011, #244): a keyboard user
// who confirms a payment from the bar's Button stays where they acted.
describe("focus after the payment settles", () => {
  const button = () =>
    screen.getByRole<HTMLButtonElement>("button", { name: "Approve and pay" });

  it("lands on the success Toast the bar became, once the payment is confirmed", async () => {
    host("invoice-queue/rows-selected");
    button().focus();

    await pay();

    expect(bar()).toBeNull();
    expect(document.activeElement).toBe(toast());
    // Focusable from script only, so it never joins the tab order.
    expect(toast()!.tabIndex).toBe(-1);
  });

  it("stays on the Button, back at rest, once the payment fails", async () => {
    host("invoice-queue/payment-failed");
    button().focus();

    await pay();

    expect(document.activeElement).toBe(button());
    expect(button().getAttribute("aria-busy")).not.toBe("true");
  });

  it("moves nothing when focus was elsewhere", async () => {
    host("invoice-queue/rows-selected");

    await pay();

    expect(document.activeElement).toBe(document.body);
  });

  it("lands on the Toast where the browser has no View Transitions", async () => {
    delete (document as Partial<Document>).startViewTransition;
    host("invoice-queue/rows-selected");
    button().focus();

    await pay();

    expect(document.activeElement).toBe(toast());
  });
});
