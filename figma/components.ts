// The library components figma:sync-components draws (ADR 0015), and what
// their tv() configs can't say: how each one's slots nest, how it turns its
// props into tv() props, and the sample copy in its text. #321 and #322 add
// the rest of the library here.

import { button } from "../src/components/Button/Button.tsx";
import { buttonEntry } from "../src/components/Button/Button.registry.ts";
import { statusTag, statusWords } from "../src/components/StatusTag/StatusTag.tsx";
import { statusTagEntry } from "../src/components/StatusTag/StatusTag.registry.ts";
import { text } from "../src/components/Text/Text.tsx";
import { textEntry } from "../src/components/Text/Text.registry.ts";
import { heading } from "../src/components/Heading/Heading.tsx";
import { headingEntry } from "../src/components/Heading/Heading.registry.ts";
import { amount, formatAmount } from "../src/components/Amount/Amount.tsx";
import { amountEntry } from "../src/components/Amount/Amount.registry.ts";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Checkbox, checkbox } from "../src/components/Checkbox/Checkbox.tsx";
import { checkboxEntry } from "../src/components/Checkbox/Checkbox.registry.ts";
import type { Copy, FrameSource, Props, Styles } from "./frames.ts";

/** Each component's text, by the anatomy's text names. */
export const sampleCopy: Record<string, Copy> = {
  Button: { label: "Approve and pay" },
  // The tag writes its own word for each status.
  StatusTag: ({ status }: Props) => ({
    word: statusWords[status as keyof typeof statusWords],
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
      disabled,
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
];

/** The one SVG `element` renders, as markup Figma draws, without its classes. */
function svgOf(element: ReactElement): string {
  const svgs =
    renderToStaticMarkup(element).match(/<svg[\s\S]*?<\/svg>/g) ?? [];
  if (svgs.length !== 1) {
    throw new Error(`expected one <svg>, rendered ${svgs.length}`);
  }
  return svgs[0]!.replace(/ (class|aria-hidden)="[^"]*"/g, "");
}
