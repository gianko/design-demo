import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Text } from "../Text/Text.tsx";
import { Screen } from "./Screen.tsx";
import {
  useAction,
  useFixtureData,
  useScreenState,
  type HostedState,
  type ScreenStateParameters,
} from "./screen-state.tsx";

// Screen sets its own density from `audience`, so each story keeps its
// density whatever the toolbar's density global is: the root's scope wins over
// the one around it. The content is plain token-classed elements until Heading
// and Text exist.
const meta = {
  title: "Components/Screen",
  component: Screen,
  // A style expectation (ADR 0012): the root is at least the viewport's
  // height, so the page colour fills the window below a short screen.
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('[data-component="Screen"]')!;
    await expect(getComputedStyle(root).minHeight).toBe(
      `${window.innerHeight}px`
    );
  },
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
// The invoice it reminds about is the fixture variant's. The plain button
// stands in for Button until Button exists.
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
          className="mt-2xs rounded-control bg-surface px-control py-3xs text-label"
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
