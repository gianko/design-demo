import type { Meta, StoryObj } from "@storybook/react-vite";

// no-pure-neutral-text (lint/taste/RULES.md). Fail sets no colour off the
// tokens itself; the defaults under the tokens do. With no text colour, a
// paragraph and a button inherit the browser's black, Tailwind's preflight
// greys a placeholder by mixing that black half with transparent, and a
// field's value stays black. Pass sets the text colour once, which the
// paragraph, the button and the field all take, and gives the placeholder
// its token, all tinted toward plum. Every control is at least the
// density's minimum target, so only this rule's findings differ.
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
        className="min-h-target rounded-control bg-surface px-control text-label"
      >
        Approve and pay
      </button>
      <input
        aria-label="Search invoices"
        placeholder="Search invoices"
        className={`min-h-target rounded-control border border-control px-control text-body ${fail ? "" : "placeholder:text-ink-muted"}`}
      />
      <input
        aria-label="Invoice"
        defaultValue="Invoice 1042"
        className="min-h-target rounded-control border border-control px-control text-body"
      />
    </div>
  ),
} satisfies Meta<{ fail: boolean }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Fail: StoryObj<typeof meta> = { args: { fail: true } };
