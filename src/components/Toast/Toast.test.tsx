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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { repo } from "../../../repo.ts";
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
import { holdToastAttribute, Toast } from "./Toast.tsx";

const scheduled = "3 invoices scheduled for the Oct 24 run.";
const failed =
  "Payment not scheduled: the funding account is too low. Add funds, then approve and pay again.";
const closeLabel = "Close payment result";

// How long a success Toast stays, read from the motion tokens rather than
// the component: the `toast` timeout token, in ms.
const toastMs: number = JSON.parse(
  readFileSync(join(repo, "tokens/motion.json"), "utf8")
).motion.timeout.toast.$value.value;

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
        <Toast tone="success" text={scheduled} closeLabel={closeLabel} />
      )}
      {state === "payment-failed" && (
        <Toast tone="failure" text={failed} closeLabel={closeLabel} />
      )}
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
// The copy a Toast shows, without its close button's hidden name.
const copyOf = (element: HTMLElement | null) =>
  element?.querySelector("p")?.textContent;
const close = () =>
  fireEvent.click(screen.getByRole("button", { name: closeLabel }));
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
  expect(copyOf(toast())).toBe(scheduled);
  expect(toast()!.dataset.tone).toBe("success");
  expect(region().textContent).toBe(scheduled);
});

it("shows the failure Toast once the payment fails, the rows still ticked, and announces it", async () => {
  host("invoice-queue/payment-failed");

  await pay();

  expect(transitions.at(-1)).toEqual(["fail"]);
  expect(copyOf(toast())).toBe(failed);
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
  // The Toast itself takes no focus; only its close button does.
  expect(toast()!.hasAttribute("tabindex")).toBe(false);
});

const screenState = () =>
  document.querySelector<HTMLElement>('[data-component="Screen"]')!.dataset
    .screenState;
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

// ADR 0013: a success Toast leaves on its own after the `toast` timeout,
// through a View Transition, and the screen stays in its state.
it("dismisses a success Toast after the toast timeout token, the screen staying in its state", async () => {
  host("default");
  await pay();
  const entered = transitions.length;

  await wait(toastMs - 1);
  expect(toast()).not.toBeNull();

  await wait(1);
  expect(toast()).toBeNull();
  expect(transitions.length).toBe(entered + 1);
  expect(screenState()).toBe("payment-scheduled");
});

// The timer pauses while the Toast is hovered, and resumes where it left
// off once the pointer leaves.
it("pauses a success Toast's timer while it is hovered", async () => {
  host("default");
  await pay();
  await wait(2000);

  fireEvent.pointerEnter(toast()!);
  await wait(toastMs * 2);
  expect(toast()).not.toBeNull();

  fireEvent.pointerLeave(toast()!);
  await wait(toastMs - 2000 - 1);
  expect(toast()).not.toBeNull();
  await wait(1);
  expect(toast()).toBeNull();
});

// Focus within holds it too: a keyboard user on its close button.
it("pauses a success Toast's timer while focus is within it", async () => {
  host("default");
  await pay();
  await wait(1000);

  act(() => screen.getByRole("button", { name: closeLabel }).focus());
  await wait(toastMs * 2);
  expect(toast()).not.toBeNull();

  act(() => screen.getByRole("table").focus());
  await wait(toastMs - 1000 - 1);
  expect(toast()).not.toBeNull();
  await wait(1);
  expect(toast()).toBeNull();
});

// A Toast nobody can see doesn't run down: the timer holds while the tab is
// hidden.
it("pauses a success Toast's timer while the tab is hidden", async () => {
  const visibility = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
  };
  host("default");
  await pay();
  await wait(3000);

  visibility("hidden");
  try {
    await wait(toastMs * 2);
    expect(toast()).not.toBeNull();
  } finally {
    visibility("visible");
    delete (document as { visibilityState?: unknown }).visibilityState;
  }
  await wait(toastMs - 3000 - 1);
  expect(toast()).not.toBeNull();
  await wait(1);
  expect(toast()).toBeNull();
});

// A failure has to be read and acted on, so it never leaves on its own.
it("never dismisses a failure Toast on its own", async () => {
  host("invoice-queue/payment-failed");
  await pay();

  await wait(toastMs * 10);

  expect(toast()!.dataset.tone).toBe("failure");
});

it.each([
  ["success", "default"],
  ["failure", "invoice-queue/payment-failed"],
] as const)(
  "dismisses a %s Toast with its close button, through a View Transition, the screen staying in its state",
  async (tone, fixture) => {
    host(fixture);
    await pay();
    const state = screenState();
    const entered = transitions.length;

    close();

    expect(toast()).toBeNull();
    expect(transitions.length).toBe(entered + 1);
    expect(screenState()).toBe(state);
    expect(tone).toBe(state === "payment-scheduled" ? "success" : "failure");
  }
);

// Closing with the keyboard removes the button that had focus; focus lands
// on the Screen, as it does when a state change removes the focused element
// and nothing takes its place (ADR 0011).
it("moves focus to the Screen when the close button that had it goes", async () => {
  host("invoice-queue/payment-failed");
  await pay();
  const closeButton = screen.getByRole("button", { name: closeLabel });
  act(() => closeButton.focus());

  close();

  expect(document.activeElement).toBe(screen.getByRole("main"));
});

// ADR 0013: a Toast shows each time its state is entered, even after it was
// closed or timed out.
it("shows a failure Toast again when a retry fails again, after it was closed", async () => {
  host("invoice-queue/payment-failed");
  await pay();
  close();
  expect(toast()).toBeNull();

  await pay();

  expect(toast()!.dataset.tone).toBe("failure");
  expect(region().textContent).toBe(failed);
});

it("shows a success Toast again when a new payment is confirmed, after it timed out", async () => {
  host("default");
  await pay();
  await wait(toastMs);
  expect(toast()).toBeNull();

  fireEvent.click(screen.getAllByRole("checkbox")[1]!);
  await pay();

  expect(toast()!.dataset.tone).toBe("success");
  // Its timer starts again, from the full duration.
  await wait(toastMs - 1);
  expect(toast()).not.toBeNull();
  await wait(1);
  expect(toast()).toBeNull();
});

// One Toast at a time: a retry that's confirmed replaces the failure with
// the success.
it("replaces the failure Toast with the success one when a retry is confirmed", async () => {
  render(
    <ScreenHost
      screenState={{
        name: "payment-failed",
        fixture: "invoice-queue/payment-failed",
      }}
      settleUnder="invoice-queue/payment-scheduled"
    >
      <BulkPay />
    </ScreenHost>
  );
  expect(toast()!.dataset.tone).toBe("failure");

  await pay();

  const toasts = document.querySelectorAll<HTMLElement>(
    '[data-component="Toast"]'
  );
  expect([...toasts].map((each) => each.dataset.tone)).toEqual(["success"]);
});

// An app can start in a success state, as a page loaded after a payment
// does; its Toast times out as any other.
it("dismisses a success Toast in the state its host starts in, after the toast timeout", async () => {
  render(
    <ScreenHost
      screenState={{
        name: "payment-scheduled",
        fixture: "invoice-queue/payment-scheduled",
      }}
    >
      <BulkPay />
    </ScreenHost>
  );

  await wait(toastMs - 1);
  expect(toast()!.dataset.tone).toBe("success");
  await wait(1);
  expect(toast()).toBeNull();
});

// Gate renders and Figma captures must be the same each run (ADR 0013):
// Storybook's decorator sets the hold attribute around every story, and a
// Toast inside it holds its timer.
it("holds the timer of a success Toast inside the hold attribute", async () => {
  render(
    <div {...{ [holdToastAttribute]: "" }}>
      <ScreenHost
        screenState={{
          name: "payment-scheduled",
          fixture: "invoice-queue/payment-scheduled",
        }}
      >
        <BulkPay />
      </ScreenHost>
    </div>
  );

  await wait(toastMs * 10);

  expect(toast()!.dataset.tone).toBe("success");
});
