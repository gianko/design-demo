import type { Meta, StoryObj } from "@storybook/react-vite";

// gray-on-color (lint/taste/RULES.md). Fail plants muted text where an
// element-level check would miss it: the scheduled tint is painted two boxes
// above the text, and the text's colour is inherited from the tinted box, not
// set on its own element. Beside it, a disabled label sits straight on the
// accent fill. Pass gives each tint its own text role, and keeps muted text
// on the neutral surfaces, including a selected row's tint, which is neither
// a status nor the accent.
const meta = {
  title: "GateFixtures/GrayOnColor",
  args: { fail: false },
  render: ({ fail }) => (
    <div className="flex flex-col items-start gap-sm bg-page p-page text-body">
      <div
        className={`rounded-surface bg-scheduled p-xs ${fail ? "text-ink-muted" : "text-scheduled"}`}
      >
        <p>
          <span>Pays Oct 20</span>
        </p>
      </div>
      <span
        className={`flex h-control items-center rounded-control bg-accent px-control text-label ${fail ? "text-disabled" : "text-on-accent"}`}
      >
        Approve
      </span>
      <span className="rounded-tag bg-failed px-2xs text-caption text-failed">
        Failed
      </span>
      <p className="text-ink-muted">Due Oct 20</p>
      <p className="bg-surface p-xs text-ink-muted">Northwind Logistics</p>
      <p className="bg-selected p-xs text-ink-muted">Ada Lovelace</p>
    </div>
  ),
} satisfies Meta<{ fail: boolean }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Fail: StoryObj<typeof meta> = { args: { fail: true } };
