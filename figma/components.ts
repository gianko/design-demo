// The library components figma:sync-components draws (ADR 0015), and what
// their tv() configs can't say: how each one's slots nest, how it turns its
// props into tv() props, the sample copy in its text, and the SVGs it
// renders. #321 and #322 add the rest of the library here.

import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { button } from "../src/components/Button/Button.tsx";
import { buttonEntry } from "../src/components/Button/Button.registry.ts";
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
import type { Copy, FrameSource, Props, Styles } from "./frames.ts";

/** Each component's text, by the anatomy's text names. */
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
