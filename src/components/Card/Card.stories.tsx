import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Amount } from "../Amount/Amount.tsx";
import { Button } from "../Button/Button.tsx";
import { Heading } from "../Heading/Heading.tsx";
import { Stack } from "../Stack/Stack.tsx";
import { StatusTag } from "../StatusTag/StatusTag.tsx";
import { Text } from "../Text/Text.tsx";
import { Card } from "./Card.tsx";

const card = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>('[data-component="Card"]')!;

// The `max-w-card` ceiling.
const ceiling = 560;

// Style expectations (ADR 0012) every story holds: the density's surface
// padding on each side, and a width no wider than the ceiling, which the
// wide viewport would otherwise stretch it to.
async function holdsPaddingAndCeiling(canvas: HTMLElement, density: string) {
  const style = getComputedStyle(card(canvas));
  const padding = density === "contractor" ? "24px" : "20px";
  await expect([
    style.paddingTop,
    style.paddingRight,
    style.paddingBottom,
    style.paddingLeft,
  ]).toEqual([padding, padding, padding, padding]);
  await expect(card(canvas).getBoundingClientRect().width).toBeLessThanOrEqual(
    ceiling
  );
}

// Card has no variants or states, so each story shows which slots it fills,
// with the content of the screen briefs that use it.
const meta = {
  title: "Components/Card",
  component: Card,
  play: ({ canvasElement, globals }) =>
    holdsPaddingAndCeiling(canvasElement, globals.density),
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

// All three slots, as payment-status has it: the overdue invoice, its amount
// and the one action.
export const Full: Story = {
  args: {
    header: (
      <Stack direction="row" justify="between">
        <Heading level={2} text="Northwind Logistics" />
        <StatusTag status="overdue" />
      </Stack>
    ),
    children: (
      <Stack gap="3xs">
        <Amount value={4800} currency="USD" display="card" />
        <Text tone="muted" text="INV-0142, due Oct 8" />
      </Stack>
    ),
    footer: <Button intent="primary" text="Send reminder" />,
  },
};

// Header and body, read-only, as payment-overview's next payment.
export const NoFooter: Story = {
  args: {
    header: (
      <Stack direction="row" justify="between">
        <Heading level={2} text="Next payment" />
        <StatusTag status="scheduled" />
      </Stack>
    ),
    children: (
      <Stack gap="3xs">
        <Amount value={3250} currency="USD" display="card" />
        <Text tone="muted" text="Arrives Oct 24" />
      </Stack>
    ),
  },
};

// The body alone.
export const BodyOnly: Story = {
  args: {
    children: (
      <Stack gap="3xs">
        <Text tone="muted" text="Paid this year" />
        <Amount value={41650} currency="USD" display="card" />
      </Stack>
    ),
  },
};

// One awaiting invoice as invoice-review has it, at admin density: its facts
// as label–value rows and the one action. The rows are the ones a Card's
// width ceiling keeps near enough to scan.
export const Review: Story = {
  args: {
    header: (
      <Stack direction="row" justify="between">
        <Heading level={2} text="INV-0147" />
        <StatusTag status="awaiting" />
      </Stack>
    ),
    children: (
      <Stack gap="2xs">
        <Stack direction="row" justify="between">
          <Text tone="muted" text="Amount" />
          <Amount value={12480.5} currency="USD" display="table" />
        </Stack>
        <Stack direction="row" justify="between">
          <Text tone="muted" text="Contractor" />
          <Text text="Northwind Logistics" />
        </Stack>
        <Stack direction="row" justify="between">
          <Text tone="muted" text="Invoice number" />
          <Text text="INV-0147" />
        </Stack>
        <Stack direction="row" justify="between">
          <Text tone="muted" text="Due" />
          <Text text="Nov 3" />
        </Stack>
        <Stack direction="row" justify="between">
          <Text tone="muted" text="Lines" />
          <Text text="6" />
        </Stack>
      </Stack>
    ),
    footer: <Button intent="primary" text="Approve and pay" />,
  },
};

// A note in the footer where there's no action yet: the invoice is waiting
// on the client.
export const FooterNote: Story = {
  args: {
    header: (
      <Stack direction="row" justify="between">
        <Heading level={2} text="Northwind Logistics & Freight Holdings Ltd." />
        <StatusTag status="awaiting" />
      </Stack>
    ),
    children: (
      <Stack gap="3xs">
        <Amount value={12480.5} currency="USD" display="card" />
        <Text tone="muted" text="INV-0147, due Nov 3" />
      </Stack>
    ),
    footer: (
      <Text
        size="caption"
        tone="muted"
        text="You'll get an email when Northwind approves it."
      />
    ),
  },
};

// Full on a phone, a contractor's usual device: the ceiling only caps the
// width, so the card narrows with the screen.
export const Phone: Story = {
  args: Full.args,
  tags: ["phone"],
  play: async ({ canvasElement, globals }) => {
    await holdsPaddingAndCeiling(canvasElement, globals.density);
    await expect(
      card(canvasElement).getBoundingClientRect().width
    ).toBeLessThan(ceiling);
  },
};
