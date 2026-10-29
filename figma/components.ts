// The library components figma:sync-components draws (ADR 0015), and what
// their tv() configs can't say: how each one's slots nest, how it turns its
// props into tv() props, the sample copy in its text, and the SVGs it
// renders.

import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
import {
  statusTag,
  statusWords,
} from "../src/components/StatusTag/StatusTag.tsx";
import { statusTagEntry } from "../src/components/StatusTag/StatusTag.registry.ts";
import { text } from "../src/components/Text/Text.tsx";
import { textEntry } from "../src/components/Text/Text.registry.ts";
import { heading } from "../src/components/Heading/Heading.tsx";
import { headingEntry } from "../src/components/Heading/Heading.registry.ts";
import { amount, formatAmount } from "../src/components/Amount/Amount.tsx";
import { amountEntry } from "../src/components/Amount/Amount.registry.ts";
import { Checkbox, checkbox } from "../src/components/Checkbox/Checkbox.tsx";
import { checkboxEntry } from "../src/components/Checkbox/Checkbox.registry.ts";
import {
  IconButton,
  iconButton,
} from "../src/components/IconButton/IconButton.tsx";
import { iconButtonEntry } from "../src/components/IconButton/IconButton.registry.ts";
import { iconNames } from "../src/components/IconButton/icons.tsx";
import { toast } from "../src/components/Toast/toast.ts";
import { toastEntry } from "../src/components/Toast/Toast.registry.ts";
import type { Anatomy, Copy, FrameSource, Props, Styles } from "./frames.ts";

/** Each component's text and slot placeholders, by the anatomy's names. */
export const sampleCopy: Record<string, Copy> = {
  Button: { label: "Approve and pay" },
  // The tag writes its own word for each status.
  StatusTag: ({ status }: Props) => ({
    word: statusWords[status as keyof typeof statusWords],
  }),
  Toast: ({ tone }: Props) => ({
    text:
      tone === "success"
        ? "3 invoices scheduled for the Oct 24 run."
        : "Payment not scheduled: the funding account is too low. Add funds, then approve and pay again.",
  }),
  Text: { copy: "Reminders go to the billing contact Northwind gave you." },
  Heading: ({ level }: Props) => ({
    title: {
      1: "Invoice INV-0142",
      2: "Payment details",
      3: "Reminders you've sent",
    }[level as 1 | 2 | 3],
  }),
  // The value is hand-written; Amount formats it, as a screen's would be.
  Amount: ({ display }: Props) => ({
    figure: formatAmount(4800, "USD", display as "card" | "table"),
  }),
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
  Sheet: { "title slot": "Title slot", "body slot": "Body slot" },
  DataTable: {
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
// included: a placeholder in Checkbox's own unticked box, not an instance
// (ADR 0015).
const selectColumn: Anatomy = {
  slot: "select",
  display: tableCell,
  children: [
    {
      slot: "selector",
      children: [
        {
          placeholder: "Checkbox",
          styles: checkbox as unknown as Styles,
          props: { checked: false, disabled: false },
        },
      ],
    },
  ],
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
  {
    entry: statusTagEntry,
    styles: statusTag as unknown as Styles,
    anatomy: () => ({ slot: "root", children: [{ text: "word" }] }),
    copy: sampleCopy.StatusTag,
  },
  {
    entry: toastEntry,
    styles: toast as unknown as Styles,
    anatomy: () => ({
      slot: "root",
      children: [
        { slot: "text", children: [{ text: "text" }] },
        // Its close button, an IconButton's box with nothing in it (ADR 0015).
        {
          placeholder: "close",
          styles: iconButton as unknown as Styles,
          props: { disabled: false },
        },
      ],
    }),
    notDrawn: {
      corner:
        "the strip along the window's bottom the toast is fixed to: a frame has no window",
    },
    copy: sampleCopy.Toast,
  },
  {
    entry: textEntry,
    styles: text as unknown as Styles,
    anatomy: () => ({ slot: "root", children: [{ text: "copy" }] }),
    copy: sampleCopy.Text,
  },
  {
    entry: headingEntry,
    styles: heading as unknown as Styles,
    anatomy: () => ({ slot: "root", children: [{ text: "title" }] }),
    copy: sampleCopy.Heading,
  },
  {
    entry: amountEntry,
    styles: amount as unknown as Styles,
    anatomy: () => ({ slot: "root", children: [{ text: "figure" }] }),
    copy: sampleCopy.Amount,
  },
  {
    entry: checkboxEntry,
    styles: checkbox as unknown as Styles,
    // Locked keeps the rest look (Checkbox.tsx), so it's no axis.
    axes: ["checked", "disabled"],
    // tv() keys are strings; Checkbox hands it the booleans and "mixed".
    render: ({ checked, disabled }) => ({
      checked: checked === "mixed" ? "mixed" : checked === "true",
      disabled: disabled === true,
    }),
    anatomy: ({ checked, disabled }) => ({
      slot: "root",
      children: [
        { slot: "box" },
        checked !== false && {
          slot: "mark",
          children: [
            {
              vector: "glyph",
              svg: svgOf(
                createElement(Checkbox, {
                  label: "",
                  checked: checked as boolean | "mixed",
                  disabled: disabled as boolean,
                })
              ),
            },
          ],
        },
      ],
    }),
    notDrawn: {
      input:
        "the native input, its own look removed: it takes the click and draws nothing",
      name: "the accessible name, read by screen readers and not shown",
    },
  },
  {
    entry: iconButtonEntry,
    styles: iconButton as unknown as Styles,
    axes: ["icon", "disabled"],
    options: { icon: iconNames },
    anatomy: ({ icon }) => ({
      slot: "root",
      children: [
        {
          slot: "icon",
          children: [
            {
              vector: "glyph",
              // The glyph the shared icon map draws for it.
              svg: svgOf(
                createElement(IconButton, {
                  icon: icon as (typeof iconNames)[number],
                  label: "",
                })
              ),
            },
          ],
        },
      ],
    }),
    notDrawn: {
      name: "the accessible name, read by screen readers and not shown",
    },
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
    // IconButton's box, a placeholder as in Toast.
    anatomy: () => ({
      slot: "root",
      children: [
        {
          slot: "header",
          children: [
            { slot: "title", children: [{ placeholder: "title slot" }] },
            {
              placeholder: "close",
              styles: iconButton as unknown as Styles,
              props: { disabled: false },
            },
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
    notDrawn: {
      room: "a StatusTag cell's room for every status word; the set's cells are slot placeholders, with no StatusTag in them",
      word: "one of the status words in a StatusTag cell's room, invisible",
    },
    copy: sampleCopy.DataTable,
    note: "Its focus rings, scroll padding and status flips live in DataTable.css, not its tv() config, so this set shows only what tv() gives. The table's full look is in Storybook.",
  },
];

/**
 * The one SVG `element` renders, as markup Figma draws: without its classes,
 * and its size its viewBox's, since a CSS class sizes it on the page.
 */
function svgOf(element: ReactElement): string {
  const svgs =
    renderToStaticMarkup(element).match(/<svg[\s\S]*?<\/svg>/g) ?? [];
  if (svgs.length !== 1) {
    throw new Error(`expected one <svg>, rendered ${svgs.length}`);
  }
  const svg = svgs[0]!.replace(
    / (class|aria-hidden|width|height)="[^"]*"/g,
    ""
  );
  const [, , width, height] = /viewBox="([^"]*)"/.exec(svg)![1]!.split(/\s+/);
  return svg.replace("<svg", `<svg width="${width}" height="${height}"`);
}
