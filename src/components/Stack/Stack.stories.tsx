import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "../Text/Text.tsx";
import { Stack } from "./Stack.tsx";

// Stack paints nothing, so each story shows its layout through the Texts it
// holds: the gap is the space between them, alignment where they sit.
const meta = { title: "Components/Stack", component: Stack } satisfies Meta<
  typeof Stack
>;

export default meta;

type Story = StoryObj<typeof meta>;

// The default: a column with the `sm` gap, children stretched to its width.
export const Column: Story = {
  args: {
    children: (
      <>
        <Text text="Northwind Logistics & Freight Holdings Ltd. hasn't paid INV-0142 yet. It was due Oct 8." />
        <Text
          tone="muted"
          text="Reminders go to the billing contact Northwind gave you."
        />
      </>
    ),
  },
};

// A row centres its children and wraps them when it runs out of room.
export const Row: Story = {
  args: {
    direction: "row",
    gap: "xs",
    children: (
      <>
        <Text text="INV-0142" />
        <Text tone="muted" text="Due Oct 8" />
        <Text tone="muted" text="Northwind Logistics & Freight Holdings Ltd." />
      </>
    ),
  },
};

// A label at the start of its row and the value at the end.
export const Between: Story = {
  args: {
    direction: "row",
    justify: "between",
    children: (
      <>
        <Text tone="muted" text="Next payment" />
        <Text text="Arrives Oct 24" />
      </>
    ),
  },
};

// Children gathered at the end of the row, where actions sit.
export const End: Story = {
  args: {
    direction: "row",
    justify: "end",
    children: (
      <Text size="caption" tone="muted" text="Last reminder sent Oct 12" />
    ),
  },
};

// Text of different sizes sharing one baseline.
export const Baseline: Story = {
  args: {
    direction: "row",
    align: "baseline",
    gap: "2xs",
    children: (
      <>
        <Text text="Paid this year" />
        <Text size="caption" tone="muted" text="Jan 1 to Oct 20" />
      </>
    ),
  },
};

// A column of narrow children, each as wide as its copy.
export const Start: Story = {
  args: {
    align: "start",
    gap: "2xs",
    children: (
      <>
        <Text text="Your money is on its way" />
        <Text size="caption" tone="muted" text="Arrives Oct 24" />
      </>
    ),
  },
};

// No gap, for lines that read as one block.
export const NoGap: Story = {
  args: {
    gap: "0",
    children: (
      <>
        <Text text="Northwind Logistics & Freight Holdings Ltd." />
        <Text size="caption" tone="muted" text="INV-0142, due Oct 8" />
      </>
    ),
  },
};

// The common shape of a screen: a wide column of groups, each a tight column
// or a row.
export const Nested: Story = {
  args: {
    gap: "xl",
    children: (
      <>
        <Stack gap="3xs">
          <Text text="Northwind hasn't paid INV-0142 yet. It was due Oct 8." />
          <Text
            size="caption"
            tone="muted"
            text="Reminders go to the billing contact Northwind gave you."
          />
        </Stack>
        <Stack direction="row" justify="between">
          <Text tone="muted" text="Last reminder sent" />
          <Text text="Oct 12" />
        </Stack>
      </>
    ),
  },
};
