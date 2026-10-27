import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  ScreenHost,
  useFixtureData,
  type ScreenStateParameters,
} from "../Screen/screen-state.tsx";
import { Amount } from "../Amount/Amount.tsx";
import { StatusTag } from "../StatusTag/StatusTag.tsx";
import { Text } from "../Text/Text.tsx";
import { DataTable } from "./DataTable.tsx";

// invoice-queue's table, as its generated screen renders it: the rows are
// the fixture variant's invoices, and each column's cell reads the row. It is
// selectable, since Approve and pay acts on the Selection, which comes from
// the host (ADR 0011). With selection off it is the same list with nothing to
// act on (#203).
function InvoiceQueue({ selectable = true }: { selectable?: boolean }) {
  const data = useFixtureData();
  return (
    <DataTable
      rows={data.invoices}
      columns={["Invoice", "Contractor", "Amount", "Due", "Status"]}
      selectable={selectable}
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
// row height, headers are the body size at weight 600 (#185), and the money
// column's header ends where its amounts do.
async function holdsRowsAndHeaders(canvas: HTMLElement, density: string) {
  const root = canvas.querySelector('[data-component="DataTable"]')!;
  const height = density === "contractor" ? 60 : 46;
  const size = density === "contractor" ? "16px" : "14px";
  for (const row of root.querySelectorAll("tr")) {
    await expect(row.getBoundingClientRect().height).toBe(height);
  }
  // The column headers, without the select-all box's cell.
  const headers = [...root.querySelectorAll<HTMLElement>("th")].filter(
    (header) => !header.querySelector('[data-component="Checkbox"]')
  );
  for (const header of headers) {
    await expect(getComputedStyle(header).fontSize).toBe(size);
    await expect(getComputedStyle(header).fontWeight).toBe("600");
  }
  const amount = headers.find((header) => header.textContent === "Amount")!;
  const hasAmounts = root.querySelector('[data-component="Amount"]');
  await expect(getComputedStyle(amount).textAlign).toBe(
    hasAmounts ? "right" : "left"
  );
}

const rowsSelected = {
  screenState: {
    name: "rows-selected",
    fixture: "invoice-queue/rows-selected",
  },
} satisfies ScreenStateParameters;

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

// The three invoices awaiting approval, ready for Approve and pay: the
// variant's own selection.
export const RowsSelected: Story = {
  render: () => <InvoiceQueue />,
  parameters: rowsSelected,
};

// Every row, which no variant starts with, so the story hosts its own.
export const AllSelected: Story = {
  render: () => (
    <ScreenHost
      screenState={rowsSelected.screenState}
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
    >
      <InvoiceQueue />
    </ScreenHost>
  ),
  parameters: rowsSelected,
};

// No contractor has an invoice in: the header alone, with nothing to select.
export const Empty: Story = {
  render: () => <InvoiceQueue />,
  parameters: {
    screenState: { name: "empty", fixture: "invoice-queue/empty" },
  } satisfies ScreenStateParameters,
};

// A table nothing acts on: no checkboxes in the header or the rows, so the
// first column starts at the table's edge. Even in a fixture variant that
// starts with rows selected, no row fills: the table shows no Selection.
export const NotSelectable: Story = {
  render: () => <InvoiceQueue selectable={false} />,
  parameters: rowsSelected,
  play: async ({ canvasElement, globals }) => {
    await holdsRowsAndHeaders(canvasElement, globals.density);
    const root = canvasElement.querySelector('[data-component="DataTable"]')!;
    await expect(
      root.querySelectorAll('[data-component="Checkbox"]')
    ).toHaveLength(0);
    const rows = [...root.querySelectorAll("tbody tr")];
    await expect(
      rows.map((row) => getComputedStyle(row).backgroundColor)
    ).toEqual(rows.map(() => "rgba(0, 0, 0, 0)"));
  },
};

// On a phone the columns keep their width and the table scrolls sideways
// inside its surface, rather than squeezing amounts onto two lines.
export const Phone: Story = { render: () => <InvoiceQueue />, tags: ["phone"] };
