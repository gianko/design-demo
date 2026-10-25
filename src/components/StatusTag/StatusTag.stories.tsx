import type { Meta, StoryObj } from "@storybook/react-vite";
import { Amount } from "../Amount/Amount.tsx";
import { Stack } from "../Stack/Stack.tsx";
import { Text } from "../Text/Text.tsx";
import { StatusTag } from "./StatusTag.tsx";

const meta = {
  title: "Components/StatusTag",
  component: StatusTag,
} satisfies Meta<typeof StatusTag>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Awaiting: Story = { args: { status: "awaiting" } };

export const Overdue: Story = { args: { status: "overdue" } };

export const Paid: Story = { args: { status: "paid" } };

export const Scheduled: Story = { args: { status: "scheduled" } };

export const Failed: Story = { args: { status: "failed" } };

// Beside the copy and money it describes, as an invoice row has it: the tag
// sits on the line of text, no taller than it.
export const InRow: Story = {
  args: Overdue.args,
  render: () => (
    <Stack gap="2xs">
      <Stack direction="row" justify="between">
        <Stack direction="row" gap="xs">
          <Text text="INV-0142, due Oct 8" />
          <StatusTag status="overdue" />
        </Stack>
        <Amount value={4800} currency="USD" display="table" />
      </Stack>
      <Stack direction="row" justify="between">
        <Stack direction="row" gap="xs">
          <Text text="INV-0139, arrives Oct 24" />
          <StatusTag status="scheduled" />
        </Stack>
        <Amount value={1250} currency="USD" display="table" />
      </Stack>
    </Stack>
  ),
};
