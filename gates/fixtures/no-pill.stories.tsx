import type { Meta, StoryObj } from "@storybook/react-vite";

// no-pill (lint/taste/RULES.md) at render time. Fail never writes
// `rounded-full`, so the static rule can't see it: a surface's token radius
// on a caption-high tag still rounds it fully. Pass holds the same tag to its
// role's radius, next to the Avatar the config exempts.
const meta = {
  title: "GateFixtures/NoPill",
  args: { pill: false },
  render: ({ pill }) => (
    <div className="flex items-center gap-sm bg-page p-page">
      <span
        className={`bg-paid px-2xs text-caption text-paid ${pill ? "rounded-surface" : "rounded-tag"}`}
      >
        Paid
      </span>
      <span
        data-component="Avatar"
        className="inline-block size-icon rounded-avatar bg-accent"
      />
    </div>
  ),
} satisfies Meta<{ pill: boolean }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Fail: StoryObj<typeof meta> = { args: { pill: true } };
