import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ScreenActionParameters } from "../../.storybook/screen-actions.ts";
import {
  Button,
  Screen,
  Stack,
  Text,
  useAction,
  useFixtureData,
  useScreenState,
} from "../../src/index.ts";

// action-transitions (lint/taste/RULES.md). Each story declares one action,
// send-reminder, as a kept screen's default story does, and renders a screen
// that wires its Button one way. Pass runs it through useAction, so it enters
// reminder-sent through `confirm` or reminder-failed through `fail`. Swapped
// swaps the two states; Untyped enters reminder-sent through an untyped View
// Transition whatever the outcome; Inert does nothing; Relabelled's Button
// doesn't carry the declared label.
type Wiring = "pass" | "swapped" | "untyped" | "inert" | "relabelled";

const declared = {
  screenActions: [
    {
      name: "send-reminder",
      label: "Send reminder",
      from: "default",
      to: {
        success: {
          name: "reminder-sent",
          fixture: "payment-status/reminder-sent",
        },
        failure: {
          name: "reminder-failed",
          fixture: "payment-status/reminder-failed",
        },
      },
    },
  ],
} satisfies ScreenActionParameters;

function Reminder({ wiring }: { wiring: Wiring }) {
  const invoice = useFixtureData().overdueInvoice!;
  const { state, enter } = useScreenState();
  const to = { success: "reminder-sent", failure: "reminder-failed" };
  const sendReminder = useAction(
    "sendReminder",
    wiring === "swapped" ? { success: to.failure, failure: to.success } : to
  );
  const onClick = {
    pass: () => sendReminder.run(invoice.id),
    swapped: () => sendReminder.run(invoice.id),
    relabelled: () => sendReminder.run(invoice.id),
    untyped: () => enter(to.success),
    inert: () => {},
  }[wiring];
  return (
    <Screen audience="contractor">
      <Stack direction="column" gap="xs">
        <Text text={`In state ${state}.`} />
        <Button
          text={wiring === "relabelled" ? "Remind client" : "Send reminder"}
          intent="primary"
          pending={sendReminder.pending}
          onClick={onClick}
        />
      </Stack>
    </Screen>
  );
}

const meta = {
  title: "GateFixtures/ActionTransitions",
  args: { wiring: "pass" },
  parameters: declared,
  render: ({ wiring }) => <Reminder wiring={wiring} />,
} satisfies Meta<{ wiring: Wiring }>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pass: Story = {};

export const Swapped: Story = { args: { wiring: "swapped" } };

export const Untyped: Story = { args: { wiring: "untyped" } };

export const Inert: Story = { args: { wiring: "inert" } };

export const Relabelled: Story = { args: { wiring: "relabelled" } };
