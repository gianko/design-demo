import type { Meta, StoryObj } from "@storybook/react-vite";

// no-all-caps (lint/taste/RULES.md) at render time. Fail never writes
// `uppercase`, so the static rule can't see it: a script sets the eyebrow's
// text-transform, and the column label is copy typed in capitals. Pass says
// the same in sentence case, next to the words the config allows in
// capitals (a currency code, IBAN, BIC, VAT, ID, PDF, CSV) and an invoice
// number, which is a code rather than a word.
const meta = {
  title: "GateFixtures/NoAllCaps",
  args: { caps: false },
  render: ({ caps }) => (
    <div className="flex flex-col gap-sm bg-page p-page text-body text-ink">
      <p
        className="text-caption"
        ref={(element) => {
          if (caps) element?.style.setProperty("text-transform", "uppercase");
        }}
      >
        Overdue
      </p>
      <p className="text-label">{caps ? "AMOUNT DUE" : "Amount due"}</p>
      <p>Paid in EUR to the IBAN and BIC on file, VAT ID included.</p>
      <p>INV-0142 is ready as a PDF or a CSV.</p>
    </div>
  ),
} satisfies Meta<{ caps: boolean }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Fail: StoryObj<typeof meta> = { args: { caps: true } };
