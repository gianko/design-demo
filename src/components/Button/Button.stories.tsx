import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { faintHovers } from "../../../.storybook/hover-step.ts";
import { Button } from "./Button.tsx";

const button = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>('[data-component="Button"]')!;

// A colour as the canvas writes it, so a token's value as written and a
// computed colour compare equal when they're the same colour.
function colour(value: string) {
  const context = document.createElement("canvas").getContext("2d")!;
  context.fillStyle = value;
  return context.fillStyle;
}

const meta = {
  title: "Components/Button",
  component: Button,
  // Room for the focus ring, which sits outside the button, so the focus
  // shot shows all of it.
  decorators: [
    (Story) => (
      <div className="p-2xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { intent: "primary", text: "Approve and pay" },
};

export const Secondary: Story = {
  args: { intent: "secondary", text: "Send reminder" },
};

export const Quiet: Story = { args: { intent: "quiet", text: "View invoice" } };

// A secondary and a quiet button on each surface level they sit on: the
// page, a card's surface and a raised bar. Hover shows as a step from rest on
// every one, in both themes; the secondary's fill stays under its hover
// rather than giving way to it (#250).
export const OnEachSurface: Story = {
  args: Secondary.args,
  render: () => (
    <div className="flex flex-col">
      {/* Static classes, so Tailwind finds each surface's. */}
      <div className="flex gap-xs bg-page p-2xs">
        <Button intent="secondary" text="Send reminder" />
        <Button intent="quiet" text="View invoice" />
      </div>
      <div className="flex gap-xs bg-surface p-2xs">
        <Button intent="secondary" text="Send reminder" />
        <Button intent="quiet" text="View invoice" />
      </div>
      <div className="flex gap-xs bg-surface-raised p-2xs">
        <Button intent="secondary" text="Send reminder" />
        <Button intent="quiet" text="View invoice" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const buttons = [
      ...canvasElement.querySelectorAll('[data-component="Button"]'),
    ];
    await expect(buttons).toHaveLength(6);
    await expect(faintHovers(buttons)).toEqual([]);
  },
};

// Nothing selected yet, so there is nothing to pay.
export const Disabled: Story = {
  args: { intent: "primary", text: "Approve and pay", disabled: true },
};

// A disabled secondary keeps its edge, in `disabled`, and its width: the
// reminder was sent today, so there's nothing to send yet.
export const DisabledSecondary: Story = {
  args: { intent: "secondary", text: "Send reminder", disabled: true },
  play: async ({ canvasElement }) => {
    const style = getComputedStyle(button(canvasElement));
    await expect(colour(style.backgroundColor)).toBe(
      colour(style.getPropertyValue("--ds-color-bg-surface"))
    );
    await expect(colour(style.borderTopColor)).toBe(
      colour(style.getPropertyValue("--ds-color-border-disabled"))
    );
    // As wide as an enabled secondary with the same label: the label, the
    // density's control padding and a 1px edge on either side.
    const label = document.createRange();
    label.selectNodeContents(button(canvasElement));
    const padding = parseFloat(
      style.getPropertyValue("--ds-density-padding-control")
    );
    await expect(
      button(canvasElement).getBoundingClientRect().width
    ).toBeCloseTo(label.getBoundingClientRect().width + 2 * padding + 2, 1);
  },
};

// A disabled quiet button stays bare, so it's no more prominent than an
// enabled one.
export const DisabledQuiet: Story = {
  args: { intent: "quiet", text: "View invoice", disabled: true },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(button(canvasElement)).backgroundColor).toBe(
      "rgba(0, 0, 0, 0)"
    );
  },
};

// The payment is running: the label stays, and the edge fills, then sweeps.
export const Pending: Story = {
  args: { intent: "primary", text: "Approve and pay", pending: true },
  tags: ["animates-while-idle"],
};

// The edge in the accent, on a neutral button.
export const PendingSecondary: Story = {
  args: { intent: "secondary", text: "Send reminder", pending: true },
  tags: ["animates-while-idle"],
};
