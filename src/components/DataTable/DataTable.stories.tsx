import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { ScreenStateParameters } from "../Screen/screen-state.tsx";
import { useFixtureData } from "../Screen/screen-state.tsx";
import { Amount } from "../Amount/Amount.tsx";
import { StatusTag } from "../StatusTag/StatusTag.tsx";
import { Text } from "../Text/Text.tsx";
import { DataTable } from "./DataTable.tsx";

// invoice-queue's table, as its generated screen renders it: the rows are
// the fixture variant's invoices, and each column's cell reads the row.
function InvoiceQueue({ selected }: { selected?: string[] }) {
  const data = useFixtureData();
  return (
    <DataTable
      rows={data.invoices}
      columns={["Invoice", "Contractor", "Amount", "Due", "Status"]}
      selected={selected}
      cell={(row) => (
        <>
          <Text text={row.number} />
          <Text text={row.contractor} />
          <Amount value={row.amount} currency={row.currency} display="table" />
          <Text text={row.dueLabel} />
          <StatusTag status={row.status} />
        </>
      )}
    />
  );
}

// Style expectations (ADR 0012) every story holds: rows are the density's
// row height, headers are 12px, and the money column's header ends where
// its amounts do.
async function holdsRowsAndHeaders(canvas: HTMLElement, density: string) {
  const root = canvas.querySelector('[data-component="DataTable"]')!;
  const height = density === "contractor" ? 60 : 46;
  for (const row of root.querySelectorAll("tr")) {
    await expect(row.getBoundingClientRect().height).toBe(height);
  }
  const headers = [...root.querySelectorAll<HTMLElement>("th")].slice(1);
  for (const header of headers) {
    await expect(getComputedStyle(header).fontSize).toBe("12px");
  }
  const amount = headers.find((header) => header.textContent === "Amount")!;
  const hasAmounts = root.querySelector('[data-component="Amount"]');
  await expect(getComputedStyle(amount).textAlign).toBe(
    hasAmounts ? "right" : "left"
  );
}

const awaiting = ["INV-0147", "INV-0148", "INV-0149"];

const rowsSelected = (
  fixture: "invoice-queue/rows-selected"
): ScreenStateParameters => ({
  screenState: { name: "rows-selected", fixture },
});

const meta = {
  title: "Components/DataTable",
  // Room for the focus ring, which sits outside the header's box.
  decorators: [
    (Story) => (
      <div className="p-2xs">
        <Story />
      </div>
    ),
  ],
  play: ({ canvasElement, globals }) =>
    holdsRowsAndHeaders(canvasElement, globals.density),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// The queue as the admin finds it: nothing selected.
export const Default: Story = { render: () => <InvoiceQueue /> };

// The three invoices awaiting approval, ready for Approve and pay.
export const RowsSelected: Story = {
  render: () => <InvoiceQueue selected={awaiting} />,
  parameters: rowsSelected("invoice-queue/rows-selected"),
};

export const AllSelected: Story = {
  render: () => (
    <InvoiceQueue
      selected={[
        "INV-0142",
        "INV-0144",
        "INV-0145",
        "INV-0146",
        "INV-0147",
        "INV-0148",
        "INV-0149",
        "INV-0151",
      ]}
    />
  ),
  parameters: rowsSelected("invoice-queue/rows-selected"),
};

// No contractor has an invoice in: the header alone, with nothing to select.
export const Empty: Story = {
  render: () => <InvoiceQueue />,
  parameters: {
    screenState: { name: "empty", fixture: "invoice-queue/empty" },
  } satisfies ScreenStateParameters,
};

// On a phone the columns keep their width and the table scrolls sideways
// inside its surface, rather than squeezing amounts onto two lines.
export const Phone: Story = { render: () => <InvoiceQueue />, tags: ["phone"] };
