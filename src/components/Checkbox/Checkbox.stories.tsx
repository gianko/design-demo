import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { colour } from "../../../.storybook/canvas-colour.ts";
import { faintHovers } from "../../../.storybook/hover-step.ts";
import { Checkbox } from "./Checkbox.tsx";

const root = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>('[data-component="Checkbox"]')!;

// Style expectations (ADR 0012) every story holds: the input, which takes
// the click, fills a square at the density's minimum target, and the box
// drawn in it is the density's icon size.
async function holdsTargetAndBox(canvas: HTMLElement, density: string) {
  const target = density === "contractor" ? 44 : 24;
  const box = density === "contractor" ? 20 : 16;
  const input = root(canvas).querySelector("input")!.getBoundingClientRect();
  await expect([input.width, input.height]).toEqual([target, target]);
  const drawn = root(canvas)
    .querySelector("span[aria-hidden]")!
    .getBoundingClientRect();
  await expect([drawn.width, drawn.height]).toEqual([box, box]);
}

// Each story is one row of invoice-queue's selection.
const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  // Room for the focus ring, which sits outside the box.
  decorators: [
    (Story) => (
      <div className="p-2xs">
        <Story />
      </div>
    ),
  ],
  play: ({ canvasElement, globals }) =>
    holdsTargetAndBox(canvasElement, globals.density),
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unchecked: Story = { args: { label: "Select INV-0142" } };

// An unticked box on each surface level a table can sit on: the page, a
// card's surface, a raised bar and an overlay. Hover shows as a step from rest on every
// one, in both themes; the box's fill stays under its hover rather than
// giving way to it (#250).
export const UncheckedOnEachSurface: Story = {
  args: Unchecked.args,
  render: () => (
    <div className="flex flex-col">
      {/* Static classes, so Tailwind finds each surface's. */}
      <div className="flex bg-page p-2xs">
        <Checkbox label="Select INV-0142" />
      </div>
      <div className="flex bg-surface p-2xs">
        <Checkbox label="Select INV-0145" />
      </div>
      <div className="flex bg-surface-raised p-2xs">
        <Checkbox label="Select INV-0148" />
      </div>
      <div className="flex bg-surface-overlay p-2xs">
        <Checkbox label="Select INV-0151" />
      </div>
    </div>
  ),
  play: async ({ canvasElement, globals }) => {
    await holdsTargetAndBox(canvasElement, globals.density);
    const boxes = [
      ...canvasElement.querySelectorAll(
        '[data-component="Checkbox"] span[aria-hidden]'
      ),
    ];
    await expect(boxes).toHaveLength(4);
    await expect(faintHovers(boxes)).toEqual([]);
  },
};

export const Checked: Story = {
  args: { label: "Select INV-0142", checked: true },
};

// The header's, when three of eight invoices are selected.
export const Mixed: Story = {
  args: { label: "Select all invoices", checked: "mixed" },
};

// A paid invoice can't be paid again.
export const Disabled: Story = {
  args: { label: "Select INV-0139", disabled: true },
};

// A disabled box that's ticked or mixed fills with `disabled`, never the
// accent: the accent is for what you can act on.
async function fillsDisabled(canvas: HTMLElement, density: string) {
  await holdsTargetAndBox(canvas, density);
  const box = getComputedStyle(
    root(canvas).querySelector("span[aria-hidden]")!
  );
  await expect(colour(box.backgroundColor)).toBe(
    colour(box.getPropertyValue("--ds-color-bg-disabled"))
  );
  await expect(colour(box.backgroundColor)).not.toBe(
    colour(box.getPropertyValue("--ds-color-bg-accent"))
  );
}

// Already in a payment run that has started.
export const DisabledChecked: Story = {
  args: { label: "Select INV-0137", checked: true, disabled: true },
  play: ({ canvasElement, globals }) =>
    fillsDisabled(canvasElement, globals.density),
};

export const DisabledMixed: Story = {
  args: { label: "Select all invoices", checked: "mixed", disabled: true },
  play: ({ canvasElement, globals }) =>
    fillsDisabled(canvasElement, globals.density),
};
