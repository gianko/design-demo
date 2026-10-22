import type { Meta, StoryObj } from "@storybook/react-vite";

// Renders one pixel apart: After and Faint each paint a single pixel that
// Before doesn't, as the corner of an empty box's top and left edges, with
// token classes only (ADR 0002). After's control edge is 3:1 against the
// page; Faint's line edge is the subtlest colour change a story can make.
const edges = { control: "border-control", line: "border-line" };

const meta = {
  title: "GateFixtures/OnePixel",
  args: { edge: undefined },
  render: ({ edge }) => (
    <div className="relative bg-page p-page">
      <p className="text-body text-ink">One pixel</p>
      {edge && <span className={`absolute border-t border-l ${edges[edge]}`} />}
    </div>
  ),
} satisfies Meta<{ edge?: keyof typeof edges }>;

export default meta;

export const Before: StoryObj<typeof meta> = {};

export const After: StoryObj<typeof meta> = { args: { edge: "control" } };

export const Faint: StoryObj<typeof meta> = { args: { edge: "line" } };
