import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { amountEntry } from "./Amount.registry.ts";

// Money. Amount owns the format, so a screen passes the value and its ISO
// code and never writes digits itself. The card shows the symbol before the
// digits ($4,800.00); a table shows the code after them (4,800.00 USD), so a
// column of mixed currencies lines up on its cents. Table amounts fill their
// cell and end at its end edge.
export const amount = tv({
  slots: { root: "text-ink tabular-nums" },
  variants: {
    display: {
      card: { root: "text-figure" },
      table: { root: "block text-right text-body" },
    },
  },
});

export type AmountProps = PropsOf<typeof amountEntry>;

// Every string in the product is English, so grouping is too.
const locale = "en-US";
// Between the digits and the code, so the code never wraps onto a line of
// its own.
const noBreakSpace = String.fromCharCode(0xa0);

function formatAmount(
  value: number,
  currency: string,
  display: AmountProps["display"]
) {
  const money = new Intl.NumberFormat(locale, { style: "currency", currency });
  if (display === "card") return money.format(value);
  // The currency's own minor unit: cents for USD, none for JPY.
  const { minimumFractionDigits, maximumFractionDigits } =
    money.resolvedOptions();
  const digits = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
  return `${digits}${noBreakSpace}${currency}`;
}

export function Amount({ value, currency, display }: AmountProps) {
  const { root } = amount({ display });
  return (
    <span data-component="Amount" className={root()}>
      {formatAmount(value, currency, display)}
    </span>
  );
}
