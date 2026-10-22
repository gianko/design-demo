import type { Meta, StoryObj } from "@storybook/react-vite";

// Two renders one pixel apart: After paints a single control-edge pixel that
// Before doesn't, as the corner of an empty box's top and left edges, with
// token classes only (ADR 0002). The control edge is 3:1 against the page in
// both themes, so the pixel differs by more than Playwright's per-pixel
// threshold.
const meta = {
  title: "GateFixtures/OnePixel",
  args: { pixel: false },
  render: ({ pixel }) => (
    <div className="relative bg-page p-page">
      <p className="text-body text-ink">One pixel</p>
      {pixel && <span className="absolute border-t border-l border-control" />}
    </div>
  ),
} satisfies Meta<{ pixel: boolean }>;

export default meta;

export const Before: StoryObj<typeof meta> = {};

export const After: StoryObj<typeof meta> = { args: { pixel: true } };
