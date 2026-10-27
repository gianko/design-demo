import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { IconButton } from "./IconButton.tsx";

const root = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>('[data-component="IconButton"]')!;

// Style expectations (ADR 0012) every story holds: the button is a square at
// the density's control height, so it lines up with a Button and meets the
// 44px contractor target, and the glyph is the brief's icon size.
async function holdsTargetAndGlyph(canvas: HTMLElement, density: string) {
  const target = density === "contractor" ? 44 : 32;
  const glyph = density === "contractor" ? 20 : 16;
  const button = root(canvas).getBoundingClientRect();
  await expect([button.width, button.height]).toEqual([target, target]);
  const drawn = root(canvas).querySelector("svg")!.getBoundingClientRect();
  await expect([drawn.width, drawn.height]).toEqual([glyph, glyph]);
}

// Each story is the close button of the invoice-detail sheet.
const meta = {
  title: "Components/IconButton",
  component: IconButton,
  // Room for the focus ring, which sits outside the button.
  decorators: [
    (Story) => (
      <div className="p-2xs">
        <Story />
      </div>
    ),
  ],
  play: ({ canvasElement, globals }) =>
    holdsTargetAndGlyph(canvasElement, globals.density),
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Close: Story = {
  args: { icon: "close", label: "Close invoice details" },
};

export const Disabled: Story = {
  args: { icon: "close", label: "Close invoice details", disabled: true },
};
