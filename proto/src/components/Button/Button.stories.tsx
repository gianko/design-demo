import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
  args: { label: "Approve and pay" },
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { intent: "primary", label: "Approve and pay" } };

export const Secondary: Story = { args: { intent: "secondary", label: "Request changes" } };

export const Disabled: Story = { args: { intent: "primary", label: "Approve and pay", disabled: true } };

export const Pending: Story = {
  args: { intent: "primary", label: "Approve and pay", pending: true, pendingLabel: "Paying 3 invoices" },
};
