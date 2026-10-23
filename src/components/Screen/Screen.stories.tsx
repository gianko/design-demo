import type { Meta, StoryObj } from "@storybook/react-vite";
import { Screen } from "./Screen.tsx";

// Screen sets its own density from `audience`, so each story keeps its
// density whatever the toolbar's density global is: the root's scope wins over
// the one around it. The content is plain token-classed elements until Heading
// and Text exist.
const meta = { title: "Components/Screen", component: Screen } satisfies Meta<
  typeof Screen
>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Admin: Story = {
  args: {
    audience: "admin",
    children: (
      <>
        <h1 className="text-title">Invoices to review</h1>
        <p className="mt-2xs">
          12 invoices from 5 contractors are waiting for approval. Approve them
          by Oct 22 to make the Oct 24 payment run.
        </p>
      </>
    ),
  },
};

export const Contractor: Story = {
  args: {
    audience: "contractor",
    children: (
      <>
        <h1 className="text-title">Your invoices</h1>
        <p className="mt-2xs">
          Northwind Logistics paid INV-0138 on Oct 2. Your next payment arrives
          Oct 24.
        </p>
      </>
    ),
  },
};
