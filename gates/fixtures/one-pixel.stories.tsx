import type { Meta, StoryObj } from "@storybook/react-vite";

// Two renders one pixel apart: After paints a single accent pixel that Before
// doesn't. Accent stands out from the page in both themes, so the pixel
// differs by more than Playwright's per-pixel threshold.
const meta = {
  title: "GateFixtures/OnePixel",
  args: { pixel: false },
  render: ({ pixel }) => (
    <div className="relative bg-page p-page">
      <p className="text-body text-ink">One pixel</p>
      {pixel && (
        <span
          className="absolute bg-accent"
          style={{ top: 0, left: 0, width: 1, height: 1 }}
        />
      )}
    </div>
  ),
} satisfies Meta<{ pixel: boolean }>;

export default meta;

export const Before: StoryObj<typeof meta> = {};

export const After: StoryObj<typeof meta> = { args: { pixel: true } };
