import type { Meta, StoryObj } from "@storybook/react-vite";
import { Amount } from "../Amount/Amount.tsx";
import { Button } from "../Button/Button.tsx";
import { Heading } from "../Heading/Heading.tsx";
import { Stack } from "../Stack/Stack.tsx";
import { StatusTag } from "../StatusTag/StatusTag.tsx";
import { Text } from "../Text/Text.tsx";
import { Card } from "./Card.tsx";

// Card has no variants or states, so each story shows which slots it fills,
// with the content of the screen briefs that use it.
const meta = { title: "Components/Card", component: Card } satisfies Meta<
  typeof Card
>;

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
