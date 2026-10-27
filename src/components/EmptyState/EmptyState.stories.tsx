import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Heading } from "../Heading/Heading.tsx";
import { PageHeader } from "../PageHeader/PageHeader.tsx";
import { Stack } from "../Stack/Stack.tsx";
import { EmptyState } from "./EmptyState.tsx";

const emptyState = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>('[data-component="EmptyState"]')!;

// Style expectations (ADR 0012) every story holds: the flat surface DataTable
// draws, a hairline and no shadow, with the density's surface radius and
// padding; a reason at body size and 600, and each line held to the
// density's measure.
async function holdsSurfaceAndType(canvas: HTMLElement, density: string) {
  const root = emptyState(canvas);
  const style = getComputedStyle(root);
  const contractor = density === "contractor";
  const padding = contractor ? "24px" : "20px";
  await expect([
    style.paddingTop,
    style.paddingRight,
    style.paddingBottom,
    style.paddingLeft,
  ]).toEqual([padding, padding, padding, padding]);
  await expect(style.borderTopLeftRadius).toBe(contractor ? "12px" : "8px");
  await expect(style.borderTopWidth).toBe("1px");
  await expect(style.boxShadow).toBe("none");
  const body = contractor ? "16px" : "14px";
  const measure = contractor ? 472 : 412;
  const [title, ...rest] = root.querySelectorAll("p");
  await expect(getComputedStyle(title!).fontWeight).toBe("600");
  for (const line of [title!, ...rest]) {
    await expect(getComputedStyle(line).fontSize).toBe(body);
    await expect(line.getBoundingClientRect().width).toBeLessThanOrEqual(
      measure
    );
  }
}

// EmptyState has no variants: each story is the copy of a list the P1 screen
// briefs leave empty, in the brief's copy rules.
const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  play: ({ canvasElement, globals }) =>
    holdsSurfaceAndType(canvasElement, globals.density),
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

// Why the list is empty, and what will appear there: the admin's queue of
// invoices to pay, with nothing in it.
export const WhatWillAppear: Story = {
  args: {
    title: "No invoices to pay",
    text: "When a contractor sends an invoice, it shows up here for you to approve.",
  },
};

// A contractor's first visit, before any invoice exists: the list says what
// will be there, so the screen doesn't look broken.
export const FirstTime: Story = {
  args: {
    title: "No invoices yet",
    text: "When you send your first invoice, it shows up here with its status and due date.",
  },
};

// A reason that says it all: no second line.
export const ReasonOnly: Story = { args: { title: "No failed payments" } };

// Where it goes: under the screen's PageHeader, in the DataTable's place,
// full width as the table would be.
export const InPlaceOfTable: Story = {
  args: WhatWillAppear.args,
  render: (args) => (
    <Stack gap="lg">
      <PageHeader title={<Heading level={1} text="Invoices" />} />
      <EmptyState {...args} />
    </Stack>
  ),
};

// FirstTime on a phone, a contractor's usual device: the copy wraps and the
// frame stays inside the screen.
export const Phone: Story = {
  args: FirstTime.args,
  tags: ["phone"],
  play: async ({ canvasElement, globals }) => {
    await holdsSurfaceAndType(canvasElement, globals.density);
    const box = emptyState(canvasElement).getBoundingClientRect();
    await expect(box.left).toBeGreaterThanOrEqual(0);
    await expect(box.right).toBeLessThanOrEqual(window.innerWidth);
  },
};
