// Written by `pnpm keep`: the default and one story per declared screen
// state, each with its fixture variant.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PaymentRun } from "./PaymentRun.tsx";

const meta = {
  title: "Screens/payment-run",
  component: PaymentRun,
  parameters: {
    screenStates: [{ name: "empty", fixture: "payment-run/empty" }],
  },
} satisfies Meta<typeof PaymentRun>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: { screenState: { name: "empty", fixture: "payment-run/empty" } },
};
