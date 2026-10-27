import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { FocusedOn } from "../../../.storybook/focused-on.tsx";
import { Text } from "../Text/Text.tsx";
import { Screen } from "./Screen.tsx";
import {
  useAction,
  useFixtureData,
  useScreenState,
  type HostedState,
  type ScreenStateParameters,
} from "./screen-state.tsx";

const root = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>('[data-component="Screen"]')!;

// Style expectations (ADR 0012) every story holds: the root is at least the
// viewport's height, so the page colour fills the window below a short
// screen; and it is focusable from script only, so it never joins the tab
// order, for focus to land on when a state change removes the focused
// element (#244).
async function holdsHeightAndFocusability(canvas: HTMLElement) {
  await expect(getComputedStyle(root(canvas)).minHeight).toBe(
    `${window.innerHeight}px`
  );
  await expect(root(canvas).tabIndex).toBe(-1);
}

// Screen sets its own density from `audience`, so each story keeps its
// density whatever the toolbar's density global is: the root's scope wins over
// the one around it. The content is plain token-classed elements until Heading
// and Text exist.
const meta = {
  title: "Components/Screen",
  component: Screen,
  play: ({ canvasElement }) => holdsHeightAndFocusability(canvasElement),
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Admin: Story = {
  args: {
    audience: "admin",
    children: (
      <>
        <h1 className="text-title">Invoices to review</h1>
        <p className="mt-2xs">
          12 invoices from 5 contractors are waiting for approval. Approve them
          by Oct 22 to make the Oct 24 payment run.
        </p>
      </>
    ),
  },
};

export const Contractor: Story = {
  args: {
    audience: "contractor",
    children: (
      <>
        <h1 className="text-title">Your invoices</h1>
        <p className="mt-2xs">
          Northwind Logistics paid INV-0138 on Oct 2. Your next payment arrives
          Oct 24.
        </p>
      </>
    ),
  },
};

// Screen states changing through the library (ADR 0011), wired the way a
// generated screen wires payment-status's send-reminder action: the screen
// holds no state, `useAction` runs `sendReminder` and enters `reminder-sent`
// or `reminder-failed` when it settles, and Screen shows the state it's in.
// The invoice it reminds about is the fixture variant's. A plain button
// stands in for Button, which ignores clicks while pending, so a second click
// reaches `useAction`; like Button, it is at least the density's minimum
// target (taste rule `target-size`).
function Reminder() {
  const { state } = useScreenState();
  const { overdueInvoice } = useFixtureData();
  const sendReminder = useAction("sendReminder", {
    success: "reminder-sent",
    failure: "reminder-failed",
  });
  return (
    <Screen audience="contractor">
      <Text text="Northwind Logistics & Freight Holdings Ltd. hasn't paid INV-0142 yet. It was due Oct 8." />
      {state === "reminder-sent" && (
        <Text
          live
          text="Reminder sent to Northwind. We'll tell you when they pay."
        />
      )}
      {state === "reminder-failed" && (
        <Text
          live
          text="The reminder didn't send. Check your connection and send it again."
        />
      )}
      {overdueInvoice && state !== "reminder-sent" && (
        <button
          type="button"
          aria-busy={sendReminder.pending}
          aria-disabled={sendReminder.pending}
          className="mt-2xs min-h-target rounded-control bg-surface px-control py-3xs text-label"
          onClick={() => sendReminder.run(overdueInvoice.id)}
        >
          Send reminder
        </button>
      )}
    </Screen>
  );
}

// The preview's ScreenHost starts each in the state, under the fixture
// variant, that `parameters.screenState` names, as it does a kept screen's.
const hosted = (screenState: HostedState): Story => ({
  args: { audience: "contractor" },
  parameters: { screenState } satisfies ScreenStateParameters,
  render: () => <Reminder />,
});

// `sendReminder` succeeds under this variant.
export const SendReminder = hosted({
  name: "default",
  fixture: "payment-status/reminder-sent",
});

// `sendReminder` fails under this variant.
export const ReminderFails = hosted({
  name: "default",
  fixture: "payment-status/reminder-failed",
});

// Rendered in the state the action enters, as a kept screen's state story is.
export const ReminderSent = hosted({
  name: "reminder-sent",
  fixture: "payment-status/reminder-sent",
});

// Focus as the library leaves it when a state change removes the focused
// element and nothing takes over its view transition name (#244): on the
// root, taken before the first paint. The root is no control, so it shows
// no focus ring.
export const FocusedAfterChange: Story = {
  args: Contractor.args,
  render: (args) => (
    <FocusedOn component="Screen">
      <Screen {...args} />
    </FocusedOn>
  ),
  play: async ({ canvasElement }) => {
    await holdsHeightAndFocusability(canvasElement);
    await expect(document.activeElement).toBe(root(canvasElement));
    await expect(getComputedStyle(root(canvasElement)).outlineStyle).toBe(
      "none"
    );
  },
};
