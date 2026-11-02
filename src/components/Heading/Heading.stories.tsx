import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Heading } from "./Heading.tsx";
import { registryDocs } from "../../../.storybook/registry-docs.tsx";
import { headingEntry } from "./Heading.registry.ts";

const meta = {
  title: "Components/Heading",
  tags: ["autodocs"],
  ...registryDocs(headingEntry),
  component: Heading,
  // A style expectation (ADR 0012): every level balances its lines.
  play: async ({ canvasElement }) => {
    const heading = canvasElement.querySelector('[data-component="Heading"]')!;
    await expect(
      getComputedStyle(heading).getPropertyValue("text-wrap-style")
    ).toBe("balance");
  },
} satisfies Meta<typeof Heading>;

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
