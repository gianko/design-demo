import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button.tsx";

const meta = {
  title: "Components/Button",
  component: Button,
  // Room for the focus ring, which sits outside the button, so the focus
  // shot shows all of it.
  decorators: [
    (Story) => (
      <div className="p-2xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { intent: "primary", text: "Approve and pay" },
};

export const Secondary: Story = {
  args: { intent: "secondary", text: "Send reminder" },
};

export const Quiet: Story = { args: { intent: "quiet", text: "View invoice" } };

// Nothing selected yet, so there is nothing to pay.
export const Disabled: Story = {
  args: { intent: "primary", text: "Approve and pay", disabled: true },
};

// A disabled secondary keeps its edge, in `disabled`, and its width: the
// reminder was sent today, so there's nothing to send yet.
export const DisabledSecondary: Story = {
  args: { intent: "secondary", text: "Send reminder", disabled: true },
};

// A disabled quiet button stays bare, so it's no more prominent than an
// enabled one.
export const DisabledQuiet: Story = {
  args: { intent: "quiet", text: "View invoice", disabled: true },
};

// The payment is running: the label stays, and the edge fills, then sweeps.
export const Pending: Story = {
  args: { intent: "primary", text: "Approve and pay", pending: true },
  tags: ["animates-while-idle"],
};

// The edge in the accent, on a neutral button.
export const PendingSecondary: Story = {
  args: { intent: "secondary", text: "Send reminder", pending: true },
  tags: ["animates-while-idle"],
};
