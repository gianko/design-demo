// Screen states change through the library (ADR 0011): an action wired
// through `useAction` enters its `to.success` state through a `confirm` View
// Transition, or its `to.failure` state through a `fail` one, and Screen shows
// the current state as a data attribute. jsdom has no View Transitions, so
// `document.startViewTransition` is stubbed as the browser's boundary: it
// records each transition's types and the state either side of its update.
// The stories compose with the Storybook preview, whose ScreenHost hosts
// them as it does in the gate.

import { composeStories, composeStory } from "@storybook/react-vite";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import preview from "../../../.storybook/preview.tsx";
import type {
  Outcome,
  ScreenActionParameters,
} from "../../../.storybook/screen-actions.ts";
import { Button } from "../Button/Button.tsx";
import { DataTable } from "../DataTable/DataTable.tsx";
import { StatusTag } from "../StatusTag/StatusTag.tsx";
import { Text } from "../Text/Text.tsx";
import { Screen } from "./Screen.tsx";
import {
  ScreenHost,
  useAction,
  useFixtureData,
  useSelectedRows,
  type HostedState,
  type ScreenStateParameters,
} from "./screen-state.tsx";
import * as stories from "./Screen.stories.tsx";

const { SendReminder, ReminderFails, ReminderSent } = composeStories(
  stories,
  preview
);

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

// Sending again from reminder-failed, and failing again, re-enters the state
// the screen is in; its live Text must say so again (#98).
it("announces the failure again when a retry fails again", async () => {
  render(<ReminderFails />);
  const added: string[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) added.push(node.textContent ?? "");
    }
  });
  observer.observe(screen.getByRole("status"), {
    childList: true,
    subtree: true,
  });

  sendReminder();
  await act(() => vi.advanceTimersByTimeAsync(1800));
  sendReminder();
  await act(() => vi.advanceTimersByTimeAsync(1800));
  observer.disconnect();

  expect(transitions.map(({ after }) => after)).toEqual([
    "reminder-failed",
    "reminder-failed",
  ]);
  expect(added).toHaveLength(2);
  expect(added[1]).toBe(added[0]);
  expect(added[0]).toMatch(/didn't send/);
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

// Focus follows the view transition name (ADR 0011, #244). Send reminder
// carries none, and reminder-sent leaves it out, so nothing takes over its
// place and focus goes to the Screen.
describe("focus after a state change", () => {
  const button = () => screen.getByRole("button", { name: "Send reminder" });

  it("lands on the Screen when the state removes the focused element and nothing carries its name", async () => {
    render(<SendReminder />);
    button().focus();

    sendReminder();
    await act(() => vi.advanceTimersByTimeAsync(1800));

    expect(screenState()).toBe("reminder-sent");
    expect(document.activeElement).toBe(screen.getByRole("main"));
    // Focusable from script only, so it never joins the tab order.
    expect(screen.getByRole("main").tabIndex).toBe(-1);
  });

  it("leaves focus where it was when the state keeps the focused element", async () => {
    render(<ReminderFails />);
    button().focus();

    sendReminder();
    await act(() => vi.advanceTimersByTimeAsync(1800));

    expect(screenState()).toBe("reminder-failed");
    expect(document.activeElement).toBe(button());
  });

  it("moves nothing when focus wasn't in what the state removed", async () => {
    render(<SendReminder />);

    sendReminder();
    await act(() => vi.advanceTimersByTimeAsync(1800));

    expect(document.activeElement).toBe(document.body);
  });

  it("lands on the Screen where the browser has no View Transitions", async () => {
    delete (document as Partial<Document>).startViewTransition;
    render(<SendReminder />);
    button().focus();

    sendReminder();
    await act(() => vi.advanceTimersByTimeAsync(1800));

    expect(document.activeElement).toBe(screen.getByRole("main"));
  });
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
      <ScreenHost
        screenState={{ name: "default", fixture: "payment-status/empty" }}
      >
        <Due />
      </ScreenHost>
    </>
  );

  expect(screen.getAllByText(/./).map((node) => node.textContent)).toEqual([
    "Oct 8",
    "Nothing due",
  ]);
});

// A confirmed action has changed the data, so the state it enters shows that
// state's own fixture variant, which the UI spec declares beside it: the paid
// rows' statuses change, and those rows flip (ADR 0011, the stagger). A
// failed one changes nothing, as it keeps the selection.
describe("the data of the state an action enters", () => {
  const declared: HostedState[] = [
    { name: "rows-selected", fixture: "bulk-pay/rows-selected" },
    { name: "payment-scheduled", fixture: "bulk-pay/payment-scheduled" },
    { name: "payment-failed", fixture: "bulk-pay/payment-failed" },
  ];

  function BulkPay() {
    const { payQueue } = useFixtureData();
    const selected = useSelectedRows();
    const pay = useAction("payInvoices", {
      success: "payment-scheduled",
      failure: "payment-failed",
    });
    return (
      <Screen audience="admin">
        <DataTable
          rows={payQueue}
          columns={["Invoice", "Status"]}
          selectionText={{
            none: "No invoices selected",
            one: "1 invoice selected",
            other: "{count} invoices selected",
          }}
          cell={(row) => (
            <>
              <Text text={row.number} />
              <StatusTag status={row.status} />
            </>
          )}
          actions={
            <Button
              intent="primary"
              text="Pay selected"
              pending={pay.pending}
              onClick={() => pay.run(selected)}
            />
          }
        />
      </Screen>
    );
  }

  const statuses = () =>
    screen.getAllByRole("row").flatMap((row) => {
      const tag = row.querySelector('[data-component="StatusTag"]');
      return tag
        ? [
            `${tag.textContent}${row.hasAttribute("data-flip") ? " (flips)" : ""}`,
          ]
        : [];
    });

  const pay = async () => {
    fireEvent.click(screen.getByRole("button", { name: "Pay selected" }));
    await act(() => vi.advanceTimersByTimeAsync(1800));
  };

  it("shows the success state's variant once the action is confirmed, flipping the rows it changed", async () => {
    render(
      <ScreenHost screenState={declared[0]} states={declared}>
        <BulkPay />
      </ScreenHost>
    );
    expect(statuses()).toEqual(["Awaiting", "Awaiting", "Awaiting"]);

    await pay();

    expect(screenState()).toBe("payment-scheduled");
    expect(statuses()).toEqual([
      "Scheduled (flips)",
      "Scheduled (flips)",
      "Scheduled (flips)",
    ]);
  });

  it("keeps the data it had when the action fails", async () => {
    render(
      <ScreenHost
        screenState={{
          name: "rows-selected",
          fixture: "bulk-pay/payment-failed",
        }}
        states={declared}
      >
        <BulkPay />
      </ScreenHost>
    );

    await pay();

    expect(screenState()).toBe("payment-failed");
    expect(statuses()).toEqual(["Awaiting", "Awaiting", "Awaiting"]);
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(4);
  });

  it("keeps its data on a confirm when its host doesn't know the state's variant", async () => {
    render(
      <ScreenHost screenState={declared[0]}>
        <BulkPay />
      </ScreenHost>
    );

    await pay();

    expect(screenState()).toBe("payment-scheduled");
    expect(statuses()).toEqual(["Awaiting", "Awaiting", "Awaiting"]);
  });

  // A kept screen's stories carry the declared states in
  // `parameters.screenStates` (generator/screen-stories.ts), and the
  // Storybook preview hands them to the host.
  it("takes the declared states from a story's parameters", async () => {
    const RowsSelected = composeStory(
      {
        parameters: {
          screenState: declared[0],
          screenStates: declared,
        } satisfies ScreenStateParameters,
        render: () => <BulkPay />,
      },
      { title: "Screens/bulk-pay" },
      preview
    );
    render(<RowsSelected />);

    await pay();

    expect(statuses()).toEqual([
      "Scheduled (flips)",
      "Scheduled (flips)",
      "Scheduled (flips)",
    ]);
  });

  // The action-transitions and motion-reduced rules open a screen's default
  // story with the screenAction and screenOutcome globals
  // (.storybook/screen-actions.ts). The screen starts in the state the
  // action's Button is clicked in, with that state's data and selection, and
  // its operations settle as the outcome's variant says.
  describe("started before an action", () => {
    const startedBefore = (screenOutcome: Outcome) =>
      composeStory(
        {
          parameters: {
            screenStates: declared,
            screenActions: [
              {
                name: "pay-selected",
                label: "Pay selected",
                from: "rows-selected",
                to: { success: declared[1]!, failure: declared[2]! },
              },
            ],
          } satisfies ScreenStateParameters & ScreenActionParameters,
          render: () => <BulkPay />,
        },
        { title: "Screens/bulk-pay" },
        {
          ...preview,
          initialGlobals: {
            ...preview.initialGlobals,
            screenAction: "pay-selected",
            screenOutcome,
          },
        }
      );

    it("starts with the start state's rows ticked, not the outcome's data", () => {
      const Started = startedBefore("success");
      render(<Started />);

      expect(screenState()).toBe("rows-selected");
      expect(statuses()).toEqual(["Awaiting", "Awaiting", "Awaiting"]);
      expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(
        4
      );
    });

    it("confirms into the success state's data", async () => {
      const Started = startedBefore("success");
      render(<Started />);

      await pay();

      expect(screenState()).toBe("payment-scheduled");
      expect(statuses()).toEqual([
        "Scheduled (flips)",
        "Scheduled (flips)",
        "Scheduled (flips)",
      ]);
    });

    it("fails as the failure variant says", async () => {
      const Started = startedBefore("failure");
      render(<Started />);

      await pay();

      expect(screenState()).toBe("payment-failed");
      expect(statuses()).toEqual(["Awaiting", "Awaiting", "Awaiting"]);
    });
  });
});

it("starts in the screen state its host names", () => {
  render(<ReminderSent />);

  expect(screenState()).toBe("reminder-sent");
  expect(screen.getByRole("status").textContent).toBe(
    "Reminder sent to Northwind. We'll tell you when they pay."
  );
});
