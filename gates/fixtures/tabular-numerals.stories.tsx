import type { Meta, StoryObj } from "@storybook/react-vite";

// tabular-numerals (lint/taste/RULES.md). Fail splits a card's amount from
// its currency symbol, so the digits' own element holds no money on its
// face, and gives a table's amount tabular figures but leaves the cell
// start-aligned. Pass has both right, next to a date, a count and a VAT
// figure, which are out of scope: VAT is three capitals but no ISO 4217
// currency code.
const meta = {
  title: "GateFixtures/TabularNumerals",
  args: { fail: false },
  render: ({ fail }) => (
    <div className="flex flex-col gap-sm bg-page p-page text-ink">
      <p className={`text-figure ${fail ? "" : "tabular-nums"}`}>
        $<span>4,800.00</span>
      </p>
      <table className="w-full text-body">
        <thead>
          <tr>
            <th className="text-left text-caption">Due</th>
            <th className="text-right text-caption">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Oct 20, 2026</td>
            <td className={`tabular-nums ${fail ? "" : "text-right"}`}>
              1,250.00 EUR
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-caption">1,204 invoices this year</p>
      <p className="text-caption">VAT 1,200.00</p>
    </div>
  ),
} satisfies Meta<{ fail: boolean }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Fail: StoryObj<typeof meta> = { args: { fail: true } };
