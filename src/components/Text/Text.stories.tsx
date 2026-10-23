import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "./Text.tsx";

const meta = { title: "Components/Text", component: Text } satisfies Meta<
  typeof Text
>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Body: Story = {
  args: {
    text: "Northwind Logistics & Freight Holdings Ltd. hasn't paid INV-0142 yet. It was due Oct 8, so you can send them a reminder.",
  },
};

export const Muted: Story = {
  args: {
    tone: "muted",
    text: "Reminders go to the billing contact Northwind gave you.",
  },
};

export const Caption: Story = {
  args: { size: "caption", tone: "muted", text: "Last reminder sent Oct 12" },
};

export const Live: Story = {
  args: {
    live: true,
    text: "Reminder sent to Northwind. We'll tell you when they pay.",
  },
};
