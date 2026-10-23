import type { Meta, StoryObj } from "@storybook/react-vite";

// text-overflow (lint/taste/RULES.md), one failure per story. Spill: an IBAN
// with no break opportunity runs out of a narrow column, and a long label
// wraps out of the bottom of a fixed-height control. Clip: a long name cut
// off by `overflow: hidden` with no ellipsis. Collide: two labels painted
// over each other. Pass: the same content truncated with an ellipsis, broken
// anywhere, or given room, and a visually hidden status region, as Screen
// renders one, whose copy runs past its 1px box because no one sees it.
const meta = {
  title: "GateFixtures/TextOverflow",
  args: { variant: "pass" },
  render: ({ variant }) => (
    <div className="flex flex-col items-start gap-sm bg-page p-page text-body text-ink">
      {variant === "spill" && (
        <>
          <p className="w-4xl">DE89370400440532013000</p>
          <span className="flex h-control w-4xl items-center rounded-control bg-surface px-control text-label">
            Approve and pay all overdue invoices
          </span>
        </>
      )}
      {variant === "clip" && (
        <p className="w-4xl overflow-hidden whitespace-nowrap">
          Northwind Logistics GmbH
        </p>
      )}
      {variant === "collide" && (
        <div className="relative h-control w-4xl">
          <span className="absolute inset-0">Awaiting</span>
          <span className="absolute inset-0">Paid</span>
        </div>
      )}
      {variant === "pass" && (
        <>
          <p className="w-4xl break-all">DE89370400440532013000</p>
          <span className="flex items-center rounded-control bg-surface px-control py-3xs text-label">
            Approve and pay all overdue invoices
          </span>
          <p className="w-4xl truncate">Northwind Logistics GmbH</p>
          <div className="flex gap-2xs">
            <span>Awaiting</span>
            <span>Paid</span>
          </div>
          <div role="status" className="sr-only">
            <p>Reminder sent to Northwind. We'll tell you when they pay.</p>
          </div>
        </>
      )}
    </div>
  ),
} satisfies Meta<{ variant: "pass" | "spill" | "clip" | "collide" }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Spill: StoryObj<typeof meta> = { args: { variant: "spill" } };

export const Clip: StoryObj<typeof meta> = { args: { variant: "clip" } };

export const Collide: StoryObj<typeof meta> = { args: { variant: "collide" } };
