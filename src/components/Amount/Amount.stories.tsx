import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../Stack/Stack.tsx";
import { Text } from "../Text/Text.tsx";
import { Amount } from "./Amount.tsx";

const meta = { title: "Components/Amount", component: Amount } satisfies Meta<
  typeof Amount
>;

export default meta;

type Story = StoryObj<typeof meta>;

// The one figure a card is about: Northwind's overdue invoice.
export const Card: Story = {
  args: { value: 4800, currency: "USD", display: "card" },
};

// An amount among others, at row size, ending at the end of its slot.
export const Table: Story = {
  args: { value: 4800, currency: "USD", display: "table" },
};

// A column of invoices in three currencies: the codes and the cents line up.
export const MixedCurrencies: Story = {
  args: Table.args,
  render: () => (
    <Stack gap="2xs">
      <Amount value={4800} currency="USD" display="table" />
      <Amount value={1250} currency="EUR" display="table" />
      <Amount value={312.5} currency="GBP" display="table" />
      <Amount value={18960} currency="CAD" display="table" />
    </Stack>
  ),
};

// The end of a label–value row, as a card's detail line has it.
export const InRow: Story = {
  args: Table.args,
  render: () => (
    <Stack direction="row" justify="between">
      <Text tone="muted" text="Paid this year" />
      <Amount value={38412.75} currency="USD" display="table" />
    </Stack>
  ),
};
