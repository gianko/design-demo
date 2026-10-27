import type { Meta, StoryObj } from "@storybook/react-vite";

// no-pure-neutral-text (lint/taste/RULES.md). Fail sets no colour off the
// tokens itself; the browser does: a paragraph with no text colour is black,
// a disabled button greys its label, a field with no value shows the
// placeholder grey, and one with a value is black. Pass gives each the same
// element its token colour, all tinted toward plum.
const meta = {
  title: "GateFixtures/NoPureNeutralText",
  args: { fail: false },
  render: ({ fail }) => (
    <div
      className={`flex flex-col items-start gap-sm bg-page p-page text-body ${fail ? "" : "text-ink"}`}
    >
      <p>Ada Lovelace</p>
      <button
        type="button"
        disabled
        className={`rounded-control bg-disabled px-control text-label ${fail ? "" : "text-disabled"}`}
      >
        Approve and pay
      </button>
      <input
        aria-label="Search invoices"
        placeholder="Search invoices"
        className={`rounded-control border border-control px-control text-body ${fail ? "" : "placeholder:text-ink-muted"}`}
      />
      <input
        aria-label="Invoice"
        defaultValue="Invoice 1042"
        className={`rounded-control border border-control px-control text-body ${fail ? "" : "text-ink"}`}
      />
    </div>
  ),
} satisfies Meta<{ fail: boolean }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Fail: StoryObj<typeof meta> = { args: { fail: true } };
