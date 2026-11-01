// An action's result on a Card (ADR 0016): a Notice in the Card's `result`
// slot, in the state the action enters. It announces its copy through
// Screen's one status region each time its state is entered; a confirmed
// result that removes the focused Button moves focus to it; a retry that
// succeeds changes its tone in place; and the Card holding it carries the
// library's view transition name. jsdom has no View Transitions, so
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
import { Card } from "../Card/Card.tsx";
import { Heading } from "../Heading/Heading.tsx";
import { Screen } from "../Screen/Screen.tsx";
import {
  ScreenHost,
  useAction,
  useFixtureData,
  useScreenState,
} from "../Screen/screen-state.tsx";
import { Text } from "../Text/Text.tsx";
import { Notice } from "./Notice.tsx";

const sent = "Reminder sent to Northwind. We'll tell you when they pay.";
const failed =
  "We couldn't send your reminder. Check your connection and try again.";

// payment-status as ADR 0016 wires it: Send reminder in the Card's footer
// while it can be sent, and the result in the Card's `result` slot, in the
// state the action enters.
function PaymentStatus() {
  const { overdueInvoice: invoice } = useFixtureData();
  const { state } = useScreenState();
  const sendReminder = useAction("sendReminder", {
    success: "reminder-sent",
    failure: "reminder-failed",
  });
  return (
    <Screen audience="contractor">
      <Card
        header={<Heading level={2} text="INV-0142" />}
        footer={
          (state === "default" || state === "reminder-failed") && (
            <Button
              text="Send reminder"
              intent="primary"
              pending={sendReminder.pending}
              onClick={() => sendReminder.run(invoice!.id)}
            />
          )
        }
        result={
          state === "reminder-sent" ? (
            <Notice tone="success" text={sent} />
          ) : state === "reminder-failed" ? (
            <Notice tone="failure" text={failed} />
          ) : undefined
        }
      >
        <Text text="Northwind Logistics & Freight Holdings Ltd." />
      </Card>
    </Screen>
  );
}

// The default state, its operations settling under `fixture`.
function host(fixture: VariantName, name = "default") {
  render(
    <ScreenHost screenState={{ name, fixture }}>
      <PaymentStatus />
    </ScreenHost>
  );
}

const region = () => screen.getByRole("status");
const notice = () =>
  document.querySelector<HTMLElement>('[data-component="Notice"]');
const card = () =>
  document.querySelector<HTMLElement>('[data-component="Card"]')!;
const button = () => screen.getByRole("button", { name: "Send reminder" });
const send = async () => {
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

it("moves focus to the Notice when a confirmed result removes the focused Button", async () => {
  host("payment-status/reminder-sent");
  button().focus();

  await send();

  expect(transitions).toEqual([["confirm"]]);
  expect(document.activeElement).toBe(notice());
  expect(notice()!.tabIndex).toBe(-1);
});

it("leaves focus on the Button a failed result keeps", async () => {
  host("payment-status/reminder-failed");
  button().focus();

  await send();

  expect(notice()).toHaveProperty("dataset.tone", "failure");
  expect(document.activeElement).toBe(button());
});

// A retry that succeeds changes the Notice's tone in place: the same
// element, the Card still holding a result, so nothing collapses and
// reopens; its new copy is announced.
it("changes tone in place when a retry succeeds", async () => {
  render(
    <ScreenHost screenState={{ name: "reminder-failed", fixture: "default" }}>
      <PaymentStatus />
    </ScreenHost>
  );
  const failure = notice();
  expect(failure).toHaveProperty("dataset.tone", "failure");

  await send();

  expect(transitions).toEqual([["confirm"]]);
  expect(notice()).toBe(failure);
  expect(notice()).toHaveProperty("dataset.tone", "success");
  expect(notice()!.textContent).toBe(sent);
  expect(region().textContent).toBe(sent);
  expect(card().classList).toContain("vt-card-result");
  expect(card().classList).not.toContain("closing-transition");
});

// A repeated failure re-enters its state: announced again, its Notice the
// same element, so nothing moves.
it("announces a repeated failure again, in place", async () => {
  host("payment-status/reminder-failed", "reminder-failed");
  const failure = notice();
  const before = region().querySelector("span");

  await send();

  expect(transitions).toEqual([["fail"]]);
  expect(notice()).toBe(failure);
  expect(region().textContent).toBe(failed);
  expect(region().querySelector("span")).not.toBe(before);
});

// The Card is the transition's group on both sides of the change that
// brings its Notice in or takes it out (src/styles.css): named while it
// holds a Notice, named by its pending Button in the old view of the change
// that brings one, and named, as closing, in the render right after it
// loses one. A Card with no result and nothing pending carries no name.
function Dropping() {
  const { state, enter } = useScreenState();
  return (
    <Screen audience="admin">
      <Card
        header={<Heading level={2} text="INV-0142" />}
        result={
          state === "reminder-sent" && <Notice tone="success" text={sent} />
        }
      >
        <button type="button" onClick={() => enter("default")}>
          Back
        </button>
        <button type="button" onClick={() => enter("archived")}>
          Archive
        </button>
      </Card>
    </Screen>
  );
}

it("names the Card only around a Notice", () => {
  render(
    <ScreenHost screenState={{ name: "reminder-sent", fixture: "default" }}>
      <Dropping />
    </ScreenHost>
  );
  expect(card().classList).toContain("vt-card-result");
  expect(card().classList).not.toContain("closing-transition");

  fireEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(notice()).toBeNull();
  expect(card().classList).toContain("vt-card-result");
  expect(card().classList).toContain("closing-transition");

  fireEvent.click(screen.getByRole("button", { name: "Archive" }));

  expect(card().classList).not.toContain("vt-card-result");
  expect(card().classList).not.toContain("closing-transition");
});

it("names the Card in the old view of the change that brings its Notice", () => {
  host("payment-status/reminder-sent");
  expect(card().classList).not.toContain("vt-card-result");
  // Named by the pending Button its footer holds, in the browser
  // (`:has([aria-busy])`), which jsdom doesn't compute.
  expect(card().classList).toContain("has-aria-busy:vt-card-result");
});

it("announces its copy through Screen's status region when it mounts", () => {
  host("payment-status/reminder-sent", "reminder-sent");

  expect(notice()).toHaveProperty("textContent", sent);
  expect(region().textContent).toBe(sent);
});
