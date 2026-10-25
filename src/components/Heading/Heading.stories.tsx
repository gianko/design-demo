import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heading } from "./Heading.tsx";

const meta = { title: "Components/Heading", component: Heading } satisfies Meta<
  typeof Heading
>;

export default meta;

type Story = StoryObj<typeof meta>;

// The screen's one title, long enough to show how it wraps.
export const Level1: Story = {
  args: {
    level: 1,
    text: "Invoice INV-0142 for Northwind Logistics & Freight Holdings Ltd.",
  },
};

export const Level2: Story = { args: { level: 2, text: "Payment details" } };

export const Level3: Story = {
  args: { level: 3, text: "Reminders you've sent" },
};
