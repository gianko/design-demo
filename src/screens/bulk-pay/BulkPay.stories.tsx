// Written by `pnpm keep`: the default and one story per declared screen
// state, each with its fixture variant, then the default with every row of
// each table with actions ticked.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BulkPay } from "./BulkPay.tsx";

const meta = {
  title: "Screens/bulk-pay",
  component: BulkPay,
  parameters: {
    screenStates: [
      { name: "empty", fixture: "bulk-pay/empty" },
      { name: "payment-scheduled", fixture: "bulk-pay/payment-scheduled" },
      { name: "payment-failed", fixture: "bulk-pay/payment-failed" },
    ],
  },
} satisfies Meta<typeof BulkPay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    screenActions: [
      {
        name: "pay-selected",
        label: "Pay selected",
        from: "default",
        tickRows: 0,
        to: {
          success: {
            name: "payment-scheduled",
            fixture: "bulk-pay/payment-scheduled",
          },
          failure: {
            name: "payment-failed",
            fixture: "bulk-pay/payment-failed",
          },
        },
      },
    ],
  },
};

export const Empty: Story = {
  parameters: { screenState: { name: "empty", fixture: "bulk-pay/empty" } },
};

export const PaymentScheduled: Story = {
  parameters: {
    screenState: {
      name: "payment-scheduled",
      fixture: "bulk-pay/payment-scheduled",
    },
  },
};

export const PaymentFailed: Story = {
  parameters: {
    screenState: { name: "payment-failed", fixture: "bulk-pay/payment-failed" },
  },
};

export const DefaultRowsTicked: Story = { parameters: { tickRows: 0 } };
