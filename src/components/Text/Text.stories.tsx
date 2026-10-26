import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Text } from "./Text.tsx";

const paragraph = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>('[data-component="Text"]')!;

// A style expectation (ADR 0012) every story holds: the last word keeps
// company.
async function wrapsPretty(canvas: HTMLElement) {
  await expect(
    getComputedStyle(paragraph(canvas)).getPropertyValue("text-wrap-style")
  ).toBe("pretty");
}

// The characters on each line of a paragraph as it renders, by where each
// character's box starts.
function charactersPerLine(element: HTMLElement) {
  const node = element.firstChild!;
  const range = document.createRange();
  const lines: number[] = [];
  let top: number | undefined;
  for (let i = 0; i < node.textContent!.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const box = range.getClientRects()[0];
    if (!box) continue;
    if (top === undefined || box.top > top + 2) lines.push(0);
    top = box.top;
    lines[lines.length - 1]!++;
  }
  return lines;
}

const meta = {
  title: "Components/Text",
  component: Text,
  play: ({ canvasElement }) => wrapsPretty(canvasElement),
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

// Long enough to run to the measure, which holds its longest line to about
// 65 characters at either density.
export const Body: Story = {
  args: {
    text: "Northwind Logistics & Freight Holdings Ltd. hasn't paid INV-0142 yet. It was due Oct 8, so you can send them a reminder.",
  },
  play: async ({ canvasElement }) => {
    await wrapsPretty(canvasElement);
    // Line breaks depend on the font's metrics, so wait for Instrument Sans.
    await document.fonts.ready;
    const longest = Math.max(...charactersPerLine(paragraph(canvasElement)));
    await expect(longest).toBeGreaterThanOrEqual(60);
    await expect(longest).toBeLessThanOrEqual(70);
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
