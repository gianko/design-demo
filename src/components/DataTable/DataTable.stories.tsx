import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { expect, waitFor } from "storybook/test";
import { fixtureVariant, type Invoice } from "../../fixtures/fixtures.ts";
import {
  ScreenHost,
  useFixtureData,
  type ScreenStateParameters,
} from "../Screen/screen-state.tsx";
import { Amount } from "../Amount/Amount.tsx";
import { Heading } from "../Heading/Heading.tsx";
import { Sheet } from "../Sheet/Sheet.tsx";
import { Stack } from "../Stack/Stack.tsx";
import { StatusTag, statusWords } from "../StatusTag/StatusTag.tsx";
import { Text } from "../Text/Text.tsx";
import { DataTable } from "./DataTable.tsx";

// invoice-queue's table, as its generated screen renders it: the rows are
// the fixture variant's invoices, and each column's cell reads the row. It is
// selectable, since Approve and pay acts on the Selection, which comes from
// the host (ADR 0011). With selection off it is the same list with nothing to
// act on (#203). With `detail`, a row opens its invoice's Sheet.
function InvoiceQueue({
  selectable = true,
  detail = false,
  rows,
}: {
  selectable?: boolean;
  detail?: boolean;
  rows?: readonly Invoice[];
}) {
  const data = useFixtureData();
  return (
    <DataTable
      rows={rows ?? data.invoices}
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
      detail={detail ? invoiceSheet : undefined}
    />
  );
}

// A label and its value on one row, as Sheet's own stories lay out a row's
// facts.
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" justify="between" gap="3xs">
      <Text tone="muted" text={label} />
      {children}
    </Stack>
  );
}

// The detail slot: the row's invoice, its amount and status first, then the
// facts the row had no room for, every value read from the row.
function invoiceSheet(row: Invoice) {
  return (
    <Sheet
      closeLabel="Close invoice details"
      title={<Heading level={2} text={row.number} />}
    >
      <Stack direction="row" justify="between" gap="sm">
        <Amount value={row.amount} currency={row.currency} display="card" />
        <StatusTag status={row.status} />
      </Stack>
      <Stack gap="2xs">
        <Fact label="Contractor">
          <Text text={row.contractor} />
        </Fact>
        <Fact label="Client">
          <Text text={row.client} />
        </Fact>
        <Fact label="Due">
          <Text text={row.dueLabel} />
        </Fact>
      </Stack>
    </Sheet>
  );
}

// The table as a person leaves it once they open a row: a real click on the
// row, or Enter with the row focused, dispatched in the first commit, so the
// story shows the table's own open path, its View Transition included,
// without its play function touching the page (ADR 0012).
function OpensRow({
  number,
  by,
  selectable,
}: {
  number: string;
  by: "click" | "Enter";
  selectable: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = [...ref.current!.querySelectorAll("tbody tr")].find(
      (each) =>
        each.querySelector("td:not(:has(input))")?.textContent === number
    ) as HTMLTableRowElement;
    if (by === "click") {
      row.click();
    } else {
      row.focus();
      row.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    }
  }, [number, by]);
  return (
    <div ref={ref}>
      <InvoiceQueue selectable={selectable} detail />
    </div>
  );
}

// Style expectations (ADR 0012) of a table whose row opened its Sheet: once
// the View Transition ends, that row's Sheet is the open modal dialog and
// has focus, it sits after the table's surface rather than inside it, the
// row no longer carries the shared transition name, and the selection is
// what it was: opening a row doesn't tick it.
async function opensSheetOf(
  canvas: HTMLElement,
  density: string,
  number: string,
  ticked: number
) {
  const sheet = await waitFor(() => {
    const open = canvas.querySelector<HTMLDialogElement>(
      '[data-component="Sheet"]'
    );
    if (!open) throw new Error("No Sheet has opened.");
    if (document.documentElement.matches(":active-view-transition")) {
      throw new Error("The sheet's View Transition is still running.");
    }
    return open;
  });
  await expect(sheet.matches(":modal")).toBe(true);
  await expect(document.activeElement).toBe(sheet);
  await expect(sheet.querySelector("h2")!.textContent).toBe(number);

  const root = canvas.querySelector('[data-component="DataTable"]')!;
  await expect(root.contains(sheet)).toBe(false);
  // The row it opened from carried the sheet's name only in the old view, so
  // no row carries it now.
  await expect(root.querySelector(".vt-row-detail")).toBeNull();
  for (const row of root.querySelectorAll("tbody tr")) {
    await expect(getComputedStyle(row).viewTransitionName).toBe("none");
  }
  await expect(
    [...root.querySelectorAll<HTMLInputElement>("tbody input")].filter(
      (box) => box.checked
    )
  ).toHaveLength(ticked);
  await holdsRowsAndHeaders(canvas, density);
}

// A Sheet is a modal dialog over the whole window, so a story with one open
// fills the window, as Sheet's own stories do.
const sheetOpen = { layout: "fullscreen" } as const;

// Style expectations (ADR 0012) every story holds: rows are the density's
// row height, headers are the body size at weight 600 (#185), and the money
// column's header ends where its amounts do. A story with more than one
// table holds each of them to it.
async function holdsRowsAndHeaders(canvas: HTMLElement, density: string) {
  for (const root of canvas.querySelectorAll('[data-component="DataTable"]')) {
    await holdsTable(root, density);
  }
}

async function holdsTable(root: Element, density: string) {
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

// The table as a screen-state change that changes statuses leaves it: it
// first renders `before`, then `after` before the first paint, so the table
// sees the statuses change rather than first appear.
function StatusesChange({
  before,
  after,
}: {
  before: readonly Invoice[];
  after: readonly Invoice[];
}) {
  const [rows, setRows] = useState(before);
  useLayoutEffect(() => setRows(after), [after]);
  return <InvoiceQueue rows={rows} />;
}

// The stagger (ADR 0011): only the rows whose status changed flip, in row
// order, one `delay-stagger` (40ms) apart, and from the 8th changed row on
// together; an unchanged row doesn't animate, so it leaves no gap. Each flip
// runs `base`. Under reduced motion each changed row is a `fast` crossfade
// with no delay. `delays` holds each row's, `null` for a row that stays still.
// The flips end before the rows are measured.
async function flipsInStagger(
  canvas: HTMLElement,
  density: string,
  delays: readonly (string | null)[]
) {
  const root = canvas.querySelector<HTMLElement>(
    '[data-component="DataTable"]'
  )!;
  await Promise.all(
    root.getAnimations({ subtree: true }).map((each) => each.finished)
  );
  await holdsRowsAndHeaders(canvas, density);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rows = [...root.querySelectorAll("tbody tr")].map((row) =>
    getComputedStyle(row)
  );
  await expect(
    rows.map((row) =>
      row.animationName === "none" ? null : row.animationDelay
    )
  ).toEqual(delays.map((delay) => (delay && reduced ? "0s" : delay)));
  const flipping = rows.filter((row) => row.animationName !== "none");
  await expect(flipping.map((row) => row.animationDuration)).toEqual(
    flipping.map(() => (reduced ? "0.12s" : "0.24s"))
  );
}

// bulk-pay's queue either side of Pay selected (#276): every invoice
// awaiting approval in rows-selected, every one scheduled once the payment
// is confirmed. The two states sit one above the other, each as its own
// table at the same width, so a play function, which only reads, can hold
// one against the other. Below them the same invoices show every status
// StatusTag has, one each, so the widest word is on the canvas whichever it
// is; every other cell reads as it does above.
const payQueue = fixtureVariant("bulk-pay/rows-selected").data.payQueue;
const everyStatus: Invoice[] = (
  Object.keys(statusWords) as Invoice["status"][]
).map((status, i) => {
  const each = payQueue[i % payQueue.length]!;
  return { ...each, id: `${each.id}-${status}`, status };
});

function PayQueueStates() {
  return (
    <Stack gap="sm">
      <InvoiceQueue rows={payQueue} />
      <InvoiceQueue
        rows={fixtureVariant("bulk-pay/payment-scheduled").data.payQueue}
      />
      <InvoiceQueue rows={everyStatus} />
    </Stack>
  );
}

// Style expectations (ADR 0012) of a table whose statuses change between
// screen states (#276): every column header sits at the same x in each
// state, so nothing shifts sideways as the changed rows flip, and the Status
// column has room for the widest tag on the canvas whichever words it shows.
async function columnsHoldStill(canvas: HTMLElement, density: string) {
  await holdsRowsAndHeaders(canvas, density);
  const tables = [
    ...canvas.querySelectorAll<HTMLElement>('[data-component="DataTable"]'),
  ];
  const headersOf = (root: HTMLElement) => [
    ...root.querySelectorAll<HTMLElement>("th"),
  ];
  const headerOffsets = tables.map((root) =>
    headersOf(root).map(
      (header) =>
        header.getBoundingClientRect().left - root.getBoundingClientRect().left
    )
  );
  for (const offsets of headerOffsets.slice(1)) {
    await expect(offsets).toEqual(headerOffsets[0]);
  }
  const widest = Math.max(
    ...[
      ...canvas.querySelectorAll<HTMLElement>('[data-component="StatusTag"]'),
    ].map((tag) => tag.getBoundingClientRect().width)
  );
  for (const root of tables) {
    const status = headersOf(root).find(
      (header) => header.textContent === "Status"
    )!;
    const style = getComputedStyle(status);
    const room =
      status.getBoundingClientRect().width -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    await expect(room).toBeGreaterThanOrEqual(widest);
  }
}

// A longer run, for the stagger's cap: twelve invoices awaiting approval.
const run = fixtureVariant("default").data.invoices.slice(0, 6);
const longRun: Invoice[] = [...run, ...run].map((each, i) => {
  const number = `INV-${String(201 + i).padStart(4, "0")}`;
  return { ...each, id: number, number, status: "awaiting" };
});

const rowsSelected = {
  screenState: {
    name: "rows-selected",
    fixture: "invoice-queue/rows-selected",
  },
} satisfies ScreenStateParameters;

const meta = {
  title: "Components/DataTable",
  // Room for the focus ring, which sits outside the header's box; a story
  // with a Sheet open fills the window as well.
  decorators: [
    (Story, { parameters }) => (
      <div
        className={
          parameters.layout === "fullscreen" ? "min-h-dvh p-2xs" : "p-2xs"
        }
      >
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

// Approve and pay confirmed: the three invoices that were awaiting approval
// flip to scheduled, 40ms apart from the first of them, while the rows above
// and below them stay still.
export const StatusesFlip: Story = {
  render: () => (
    <StatusesChange
      before={fixtureVariant("default").data.invoices}
      after={fixtureVariant("invoice-queue/payment-scheduled").data.invoices}
    />
  ),
  play: ({ canvasElement, globals }) =>
    flipsInStagger(canvasElement, globals.density, [
      null,
      null,
      null,
      null,
      "0s",
      "0.04s",
      "0.08s",
      null,
    ]),
};

// Ten statuses change in a run of twelve: the already-scheduled 3rd and 10th
// rows don't count, and from the 8th changed row on, the rest flip together.
export const ManyStatusesFlip: Story = {
  render: () => (
    <StatusesChange
      before={longRun.map((each, i) =>
        i === 2 || i === 9 ? { ...each, status: "scheduled" } : each
      )}
      after={longRun.map((each) => ({ ...each, status: "scheduled" }))}
    />
  ),
  play: ({ canvasElement, globals }) =>
    flipsInStagger(canvasElement, globals.density, [
      "0s",
      "0.04s",
      null,
      "0.08s",
      "0.12s",
      "0.16s",
      "0.2s",
      "0.24s",
      "0.28s",
      null,
      "0.28s",
      "0.28s",
    ]),
};

// bulk-pay's queue in rows-selected, all awaiting, above the same queue in
// payment-scheduled, all scheduled: the columns hold still between the two
// (#276), since the Status column keeps room for the widest status word.
export const ColumnsHoldWhenStatusesChange: Story = {
  render: () => <PayQueueStates />,
  play: ({ canvasElement, globals }) =>
    columnsHoldStill(canvasElement, globals.density),
};

// The same on a phone, where every column is as narrow as its content: the
// Status column of awaiting tags still has room for a scheduled one.
export const ColumnsHoldWhenStatusesChangeOnPhone: Story = {
  ...ColumnsHoldWhenStatusesChange,
  tags: ["phone"],
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

// A table whose rows open their invoice's Sheet, none open yet: each row
// takes focus, and answers hover and press.
export const WithDetail: Story = {
  render: () => <InvoiceQueue selectable={false} detail />,
};

// Row → sheet (ADR 0011): clicking INV-0148's row opens its Sheet.
export const OpensOnClick: Story = {
  render: () => <OpensRow number="INV-0148" by="click" selectable={false} />,
  parameters: sheetOpen,
  play: ({ canvasElement, globals }) =>
    opensSheetOf(canvasElement, globals.density, "INV-0148", 0),
};

// The keyboard path: Enter on the focused INV-0145 row opens its Sheet.
export const OpensOnEnter: Story = {
  render: () => <OpensRow number="INV-0145" by="Enter" selectable={false} />,
  parameters: sheetOpen,
  play: ({ canvasElement, globals }) =>
    opensSheetOf(canvasElement, globals.density, "INV-0145", 0),
};

// A selectable table with a detail slot: with three invoices ticked, clicking
// the ticked INV-0148's row opens its Sheet, and the three stay ticked.
export const SelectableOpensOnClick: Story = {
  render: () => <OpensRow number="INV-0148" by="click" selectable />,
  parameters: { ...rowsSelected, ...sheetOpen },
  play: ({ canvasElement, globals }) =>
    opensSheetOf(canvasElement, globals.density, "INV-0148", 3),
};

// Enter on an unticked row of the same table opens its Sheet without
// ticking it.
export const SelectableOpensOnEnter: Story = {
  render: () => <OpensRow number="INV-0142" by="Enter" selectable />,
  parameters: { ...rowsSelected, ...sheetOpen },
  play: ({ canvasElement, globals }) =>
    opensSheetOf(canvasElement, globals.density, "INV-0142", 3),
};
