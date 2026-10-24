// Screen states change through the library (ADR 0011): an action wired
// through `useAction` enters its `to.success` state through a `confirm` View
// Transition, or its `to.failure` state through a `fail` one, and Screen shows
// the current state as a data attribute. jsdom has no View Transitions, so
// `document.startViewTransition` is stubbed as the browser's boundary: it
// records each transition's types and the state either side of its update.

import { composeStories } from "@storybook/react-vite";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Text } from "../Text/Text.tsx";
import { ScreenHost, useFixtureData } from "./screen-state.tsx";
import * as stories from "./Screen.stories.tsx";

const { SendReminder, ReminderFails, ReminderSent } = composeStories(stories);

type Transition = { types: string[]; before: string; after: string };
let transitions: Transition[];

const screenState = () =>
  screen.getByRole("main").getAttribute("data-screen-state");

beforeEach(() => {
  vi.useFakeTimers();
  transitions = [];
  document.startViewTransition = ((options: StartViewTransitionOptions) => {
    const before = screenState() ?? "";
    options.update?.();
    transitions.push({
      types: [...(options.types ?? [])],
      before,
      after: screenState() ?? "",
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

const sendReminder = () =>
  fireEvent.click(screen.getByRole("button", { name: "Send reminder" }));

it("starts in the default screen state", () => {
  render(<SendReminder />);

  expect(screenState()).toBe("default");
  expect(transitions).toEqual([]);
});

it("enters reminder-sent through a confirm View Transition once sendReminder succeeds", async () => {
  render(<SendReminder />);

  sendReminder();
  await act(() => vi.advanceTimersByTimeAsync(1799));
  expect(screenState()).toBe("default");
  expect(transitions).toEqual([]);

  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(transitions).toEqual([
    { types: ["confirm"], before: "default", after: "reminder-sent" },
  ]);
  expect(screen.getByRole("status").textContent).toBe(
    "Reminder sent to Northwind. We'll tell you when they pay."
  );
});

it("enters reminder-failed through a fail View Transition once sendReminder fails", async () => {
  render(<ReminderFails />);

  sendReminder();
  await act(() => vi.advanceTimersByTimeAsync(1800));

  expect(transitions).toEqual([
    { types: ["fail"], before: "default", after: "reminder-failed" },
  ]);
  expect(screen.getByRole("status").textContent).toMatch(/didn't send/);
});

it("holds the action pending until sendReminder settles, and runs it once", async () => {
  render(<SendReminder />);
  const button = screen.getByRole("button", { name: "Send reminder" });
  expect(button.getAttribute("aria-busy")).toBe("false");

  sendReminder();
  sendReminder();
  expect(button.getAttribute("aria-busy")).toBe("true");

  await act(() => vi.advanceTimersByTimeAsync(1800));
  expect(transitions).toHaveLength(1);
  await act(() => vi.advanceTimersByTimeAsync(1800));
  expect(transitions).toHaveLength(1);
});

it("changes state without a transition where the browser has no View Transitions", async () => {
  delete (document as Partial<Document>).startViewTransition;
  render(<SendReminder />);

  sendReminder();
  await act(() => vi.advanceTimersByTimeAsync(1800));

  expect(screenState()).toBe("reminder-sent");
});

// A generated screen reads its bound data, and its operations' arguments,
// from the fixture variant its host renders (ADR 0004, ADR 0011).
it("reads the data of the fixture variant its host names", () => {
  function Due() {
    const { overdueInvoice } = useFixtureData();
    return <Text text={overdueInvoice?.dueLabel ?? "Nothing due"} />;
  }

  render(
    <>
      <ScreenHost>
        <Due />
      </ScreenHost>
      <ScreenHost variant="payment-status/empty">
        <Due />
      </ScreenHost>
    </>
  );

  expect(screen.getAllByText(/./).map((node) => node.textContent)).toEqual([
    "Oct 8",
    "Nothing due",
  ]);
});

it("starts in the screen state its host names", () => {
  render(<ReminderSent />);

  expect(screenState()).toBe("reminder-sent");
  expect(screen.getByRole("status").textContent).toBe(
    "Reminder sent to Northwind. We'll tell you when they pay."
  );
});
