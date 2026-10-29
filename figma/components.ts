// The library components figma:sync-components draws (ADR 0015), and what
// their tv() configs can't say: how each one's slots nest, how it turns its
// props into tv() props, and the sample copy in its text. #321 and #322 add
// the rest of the library here.

import { button } from "../src/components/Button/Button.tsx";
import { buttonEntry } from "../src/components/Button/Button.registry.ts";
import { card } from "../src/components/Card/Card.tsx";
import { cardEntry } from "../src/components/Card/Card.registry.ts";
import { dataTable } from "../src/components/DataTable/DataTable.tsx";
import { dataTableEntry } from "../src/components/DataTable/DataTable.registry.ts";
import { emptyState } from "../src/components/EmptyState/EmptyState.tsx";
import { emptyStateEntry } from "../src/components/EmptyState/EmptyState.registry.ts";
import { pageHeader } from "../src/components/PageHeader/PageHeader.tsx";
import { pageHeaderEntry } from "../src/components/PageHeader/PageHeader.registry.ts";
import { sheet } from "../src/components/Sheet/Sheet.tsx";
import { sheetEntry } from "../src/components/Sheet/Sheet.registry.ts";
import type { Anatomy, FrameSource, Styles } from "./frames.ts";

/** Each component's text and placeholders, by the anatomy's names. */
export const sampleCopy: Record<string, Record<string, string>> = {
  Button: { label: "Approve and pay" },
  Card: {
    "header slot": "Header slot",
    "body slot": "Body slot",
    "footer slot": "Footer slot",
  },
  EmptyState: {
    title: "No invoices to pay",
    text: "When a contractor sends an invoice, it shows up here for you to approve.",
  },
  PageHeader: {
    "title slot": "Title slot",
    "description slot": "Description slot",
    "actions slot": "Actions slot",
  },
  Sheet: {
    "title slot": "Title slot",
    "close button": "IconButton: close",
    "body slot": "Body slot",
  },
  DataTable: {
    Checkbox: "Checkbox",
    "column 1": "Invoice",
    "column 2": "Due",
    "column 3": "Status",
    "cell slot": "Cell slot",
    count: "2 invoices selected",
    "actions slot": "Actions slot",
    "detail slot": "Detail slot",
  },
};

// The layout CSS gives an element without a class (Anatomy's `display`): a
// block's children stack, and a table row's cells sit in a line, centred
// down it as `align-middle` centres each cell's content in a cell the row's
// height.
const block = "flex flex-col";
const tableRow = "flex items-center";
const tableCell = "flex";

// DataTable's columns and rows: a few, so the frame reads as a list.
const columns = [1, 2, 3];
const rows = [1, 2, 3];

// The Checkbox a selectable table puts first in each row, header row
// included: a placeholder, not an instance (ADR 0015).
const selectColumn: Anatomy = {
  slot: "select",
  display: tableCell,
  children: [{ slot: "selector", children: [{ placeholder: "Checkbox" }] }],
};

export const frameSources: FrameSource[] = [
  {
    entry: buttonEntry,
    styles: button as unknown as Styles,
    // Button drops pending while disabled (Button.tsx), so that pair ships
    // as the disabled look.
    render: (variant) => ({
      ...variant,
      pending: Boolean(variant.pending) && !variant.disabled,
    }),
    anatomy: ({ pending }) => ({
      slot: "root",
      children: [
        { text: "label" },
        pending === true && { slot: "edge", children: [{ slot: "sweep" }] },
      ],
    }),
    copy: sampleCopy.Button,
  },

  // ── One-variant sets (#322): each slot a placeholder ──
  {
    entry: cardEntry,
    styles: card as unknown as Styles,
    // The header and footer render only when given; the set shows both.
    anatomy: () => ({
      slot: "root",
      children: ["header", "body", "footer"].map((slot) => ({
        slot,
        display: block,
        children: [{ placeholder: `${slot} slot` }],
      })),
    }),
    copy: sampleCopy.Card,
  },
  {
    entry: emptyStateEntry,
    styles: emptyState as unknown as Styles,
    // Two paragraphs, its props' copy; it has no slots.
    anatomy: () => ({
      slot: "root",
      children: ["title", "text"].map((slot) => ({
        slot,
        display: block,
        children: [{ text: slot }],
      })),
    }),
    copy: sampleCopy.EmptyState,
  },
  {
    entry: pageHeaderEntry,
    styles: pageHeader as unknown as Styles,
    anatomy: () => ({
      slot: "root",
      children: [
        {
          slot: "heading",
          children: [
            { placeholder: "title slot" },
            { placeholder: "description slot" },
          ],
        },
        { slot: "actions", children: [{ placeholder: "actions slot" }] },
      ],
    }),
    copy: sampleCopy.PageHeader,
  },
  {
    entry: sheetEntry,
    styles: sheet as unknown as Styles,
    // The panel, without the scrim behind it; its own close button is
    // IconButton, a placeholder here.
    anatomy: () => ({
      slot: "root",
      children: [
        {
          slot: "header",
          children: [
            { slot: "title", children: [{ placeholder: "title slot" }] },
            { placeholder: "close button" },
          ],
        },
        { slot: "body", children: [{ placeholder: "body slot" }] },
      ],
    }),
    copy: sampleCopy.Sheet,
  },
  {
    entry: dataTableEntry,
    styles: dataTable as unknown as Styles,
    // A table with every slot filled: selectable, so a Checkbox column and
    // the actions footer, and a detail Sheet, which the page shows over the
    // table and the set as a placeholder below it. Its rows at rest:
    // unticked, and few enough not to scroll.
    anatomy: () => ({
      slot: "root",
      display: block,
      children: [
        {
          slot: "body",
          display: block,
          children: [
            {
              slot: "table",
              display: block,
              children: [
                {
                  slot: "headerRow",
                  display: tableRow,
                  children: [
                    selectColumn,
                    ...columns.map((n) => ({
                      slot: "header",
                      display: tableCell,
                      children: [{ text: `column ${n}` }],
                    })),
                  ],
                },
                ...rows.map(() => ({
                  slot: "row",
                  display: tableRow,
                  children: [
                    selectColumn,
                    ...columns.map(() => ({
                      slot: "cell",
                      display: tableCell,
                      children: [{ placeholder: "cell slot" }],
                    })),
                  ],
                })),
              ],
            },
          ],
        },
        {
          slot: "footer",
          children: [
            { slot: "count", children: [{ text: "count" }] },
            { slot: "buttons", children: [{ placeholder: "actions slot" }] },
          ],
        },
        { placeholder: "detail slot" },
      ],
    }),
    copy: sampleCopy.DataTable,
    note: "Its focus rings, scroll padding and status flips live in DataTable.css, not its tv() config, so this set shows only what tv() gives. The table's full look is in Storybook.",
  },
];
