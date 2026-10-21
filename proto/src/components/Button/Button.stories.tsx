import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { label: "Approve and pay" } };

export const Secondary: Story = { args: { intent: "secondary", label: "Request changes" } };

export const WithIcon: Story = { args: { intent: "secondary", icon: "download", label: "Download invoice" } };

export const Disabled: Story = { args: { label: "Pay 3 invoices", disabled: true } };

export const Pending: Story = { args: { label: "Pay 3 invoices", pending: true } };

export const SecondaryPending: Story = { args: { intent: "secondary", label: "Send reminder", pending: true } };
