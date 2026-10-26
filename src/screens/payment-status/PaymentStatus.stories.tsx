// Written by `pnpm keep`: the default and one story per declared screen
// state, each with its fixture variant.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PaymentStatus } from "./PaymentStatus.tsx";

const meta = {
  title: "Screens/payment-status",
  component: PaymentStatus,
} satisfies Meta<typeof PaymentStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    screenState: { name: "empty", fixture: "payment-status/empty" },
  },
};

export const ReminderSent: Story = {
  parameters: {
    screenState: {
      name: "reminder-sent",
      fixture: "payment-status/reminder-sent",
    },
  },
};

export const ReminderFailed: Story = {
  parameters: {
    screenState: {
      name: "reminder-failed",
      fixture: "payment-status/reminder-failed",
    },
  },
};
