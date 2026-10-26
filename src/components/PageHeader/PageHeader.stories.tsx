import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Button } from "../Button/Button.tsx";
import { Heading } from "../Heading/Heading.tsx";
import { Text } from "../Text/Text.tsx";
import { PageHeader } from "./PageHeader.tsx";

const part = (canvas: HTMLElement, component: string) =>
  canvas.querySelector<HTMLElement>(`[data-component="${component}"]`)!;

// A style expectation (ADR 0012): the last action ends where the header ends,
// and it shares the title's row.
async function actionsEndTheTitleRow(canvas: HTMLElement) {
  await document.fonts.ready;
  const header = part(canvas, "PageHeader").getBoundingClientRect();
  const title = part(canvas, "Heading").getBoundingClientRect();
  const button = [...canvas.querySelectorAll('[data-component="Button"]')]
    .at(-1)!
    .getBoundingClientRect();
  await expect(button.right).toBe(header.right);
  await expect(button.top).toBeLessThan(title.bottom);
}

// PageHeader has no variants or states, so each story shows which slots it
// fills, with the titles of the screen briefs that use it.
const meta = {
  title: "Components/PageHeader",
  component: PageHeader,
} satisfies Meta<typeof PageHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

// invoice-queue with rows selected: the one action at the end of the row.
export const WithAction: Story = {
  args: {
    title: <Heading level={1} text="Invoices" />,
    actions: <Button intent="primary" text="Approve and pay" />,
  },
  play: ({ canvasElement }) => actionsEndTheTitleRow(canvasElement),
};

// invoice-queue before anything is selected: the title alone.
export const TitleOnly: Story = {
  args: { title: <Heading level={1} text="Invoices" /> },
};

// payment-run: the run's date under the title, read-only.
export const WithDescription: Story = {
  args: {
    title: <Heading level={1} text="Payment run" />,
    description: <Text tone="muted" text="Pays out Oct 24" />,
  },
};

// Two actions, the main one last, nearest the end of the row.
export const TwoActions: Story = {
  args: {
    title: <Heading level={1} text="Overdue invoices" />,
    description: <Text tone="muted" text="3 invoices, oldest due Oct 8" />,
    actions: (
      <>
        <Button intent="secondary" text="Send reminders" />
        <Button intent="primary" text="Approve and pay" />
      </>
    ),
  },
  play: ({ canvasElement }) => actionsEndTheTitleRow(canvasElement),
};

// A long title on a phone: the action wraps under it rather than squeezing
// it, and nothing spills.
export const Phone: Story = {
  args: {
    title: (
      <Heading
        level={1}
        text="Review INV-0147 from Northwind Logistics & Freight Holdings Ltd."
      />
    ),
    actions: <Button intent="primary" text="Approve and pay" />,
  },
  tags: ["phone"],
  play: async ({ canvasElement }) => {
    await document.fonts.ready;
    const title = part(canvasElement, "Heading").getBoundingClientRect();
    const button = part(canvasElement, "Button").getBoundingClientRect();
    await expect(button.top).toBeGreaterThanOrEqual(title.bottom);
  },
};
