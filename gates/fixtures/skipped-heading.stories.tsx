import type { Meta, StoryObj } from "@storybook/react-vite";

// skipped-heading (lint/taste/RULES.md). Fail goes two levels deeper twice:
// an <h1> straight to an <h3>, and an <h3> to a role="heading" at
// aria-level 5. Pass starts below level 1, as a story fragment may, goes one
// level deeper at a time, by tag and by aria-level, climbs back up any
// number of levels, and hides an <h6> no one reads, so it isn't in the
// outline.
const meta = {
  title: "GateFixtures/SkippedHeading",
  args: { fail: false },
  render: ({ fail }) =>
    fail ? (
      <div className="flex flex-col gap-sm bg-page p-page text-ink">
        <h1 className="text-title">Invoices</h1>
        <h3 className="text-label">Overdue</h3>
        <div role="heading" aria-level={5} className="text-label">
          Northwind Logistics
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-sm bg-page p-page text-ink">
        <h2 className="text-heading">Payment details</h2>
        <h3 className="text-label">Bank account</h3>
        <h6 hidden className="text-label">
          Routing
        </h6>
        <div role="heading" aria-level={4} className="text-label">
          Northwind Logistics
        </div>
        <h1 className="text-title">Invoices</h1>
        <h2 className="text-heading">Overdue</h2>
      </div>
    ),
} satisfies Meta<{ fail: boolean }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Fail: StoryObj<typeof meta> = { args: { fail: true } };
