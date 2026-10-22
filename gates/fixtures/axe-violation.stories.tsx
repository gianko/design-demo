import type { Meta, StoryObj } from "@storybook/react-vite";

// A checkbox role without aria-checked: axe's aria-required-attr, planted
// where nothing else about the render changes.
const meta = {
  title: "GateFixtures/AxeViolation",
  render: () => (
    <div className="bg-page p-page">
      <span role="checkbox" className="text-body text-ink">
        Remember me
      </span>
    </div>
  ),
} satisfies Meta;

export default meta;

export const Violation: StoryObj<typeof meta> = {};
