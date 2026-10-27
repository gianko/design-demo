import type { Meta, StoryObj } from "@storybook/react-vite";

// target-size (lint/taste/RULES.md). Fail shrinks three targets under 44px
// high: a button, a link that stands on its own, and a checkbox whose label
// is no taller than the box. They hold the 24px admin floor, so only the
// contractor renders fail. Pass gives each the density's minimum target,
// the checkbox through its label. Both keep what the rule exempts: a link
// inside a sentence, and a small button in an admin scope.
const meta = {
  title: "GateFixtures/TargetSize",
  args: { small: false },
  render: ({ small }) => (
    <div className="flex flex-col items-start gap-sm bg-page p-page text-body text-ink">
      <button
        type="button"
        className={`rounded-control border border-control bg-surface px-control text-label ${small ? "py-3xs" : "min-h-target"}`}
      >
        Remove
      </button>
      <a
        href="#terms"
        className={`text-ink underline ${small ? "inline-block py-3xs" : "inline-flex min-h-target items-center"}`}
      >
        Payment terms
      </a>
      <label
        className={`inline-flex items-center gap-2xs text-label ${small ? "" : "min-h-target"}`}
      >
        <input type="checkbox" className="size-lg" />
        Remember this payee
      </label>
      <p>
        Read the{" "}
        <a href="#terms" className="text-ink underline">
          payment terms
        </a>{" "}
        before you pay.
      </p>
      <div data-density="admin">
        <button
          type="button"
          className="rounded-control border border-control bg-surface px-control py-3xs text-label"
        >
          Dismiss
        </button>
      </div>
    </div>
  ),
} satisfies Meta<{ small: boolean }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Fail: StoryObj<typeof meta> = { args: { small: true } };
