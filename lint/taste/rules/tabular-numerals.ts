// `tabular-numerals` (lint/taste/RULES.md). Origin: new; impeccable has no
// such rule. Money is grouped digits with two decimals next to a currency
// symbol or an ISO 4217 code (not any three capitals: "VAT 1,200.00" is not
// money), and the symbol may sit in a neighbouring element
// (`$<span>4,800.00</span>`), so the digits are read with their context.
// Whatever paints the digits needs tabular figures, and a money cell in a
// table ends its text at the cell's end edge. Dates and counts are out of
// scope.

import { inPage, type RenderFinding, type RenderRule } from "../render.ts";
import { help } from "../rules-md.ts";

export const id = "tabular-numerals";

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: (page, root) =>
    inPage(page, root, untabular, Intl.supportedValuesOf("currency")),
};

function untabular(root: Element, isoCodes: string[]): RenderFinding[] {
  const failures: RenderFinding[] = [];
  // Grouped by commas or (no-break) spaces.
  const amount = new RegExp(
    String.raw`\d{1,3}(?:[,\u00a0\u202f ]\d{3})*\.\d{2}(?!\d)`,
    "g"
  );
  const currency = `(?:[$€£¥]|\\b(?:${isoCodes.join("|")})\\b)`;
  for (const { node, element, text } of taste.texts(root)) {
    for (const [digits] of text.matchAll(amount)) {
      // Money if a currency sits right before or after the digits, in the
      // text node's element or up to two elements out.
      const money = [
        element,
        element.parentElement,
        element.parentElement?.parentElement,
      ]
        .filter(
          (context): context is HTMLElement => context instanceof HTMLElement
        )
        .some((context) => {
          const around = taste.words(context.textContent!);
          const escaped = digits.replace(/[.]/g, "\\.");
          return new RegExp(
            `${currency}\\s?-?${escaped}|${escaped}\\s?${currency}`
          ).test(around);
        });
      if (!money) continue;

      if (
        !getComputedStyle(element).fontVariantNumeric.includes("tabular-nums")
      ) {
        failures.push(
          taste.at(element, `${taste.quote(digits)} lacks tabular-nums.`)
        );
      }

      const cell = element.closest(
        "td, th, [role=cell], [role=gridcell], [role=columnheader], [role=rowheader]"
      );
      if (cell && root.contains(cell)) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const textEnd = range.getBoundingClientRect().right;
        const style = getComputedStyle(cell);
        const contentEnd =
          cell.getBoundingClientRect().right -
          parseFloat(style.borderRightWidth) -
          parseFloat(style.paddingRight);
        if (contentEnd - textEnd > 1) {
          failures.push(
            taste.at(
              element,
              `${taste.quote(text)} is not end-aligned in its cell.`
            )
          );
        }
      }
    }
  }
  return failures;
}
