// Written by `pnpm keep`: the default and one story per declared screen
// state, each with its fixture variant, then the default with each detail
// table's first row's Sheet open.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MyInvoices } from "./MyInvoices.tsx";

const meta = {
  title: "Screens/my-invoices",
  component: MyInvoices,
  parameters: {
    screenStates: [{ name: "empty", fixture: "my-invoices/empty" }],
  },
} satisfies Meta<typeof MyInvoices>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: { screenState: { name: "empty", fixture: "my-invoices/empty" } },
};

export const DefaultSheetOpen: Story = {
  parameters: { layout: "fullscreen", openSheet: 0 },
};
