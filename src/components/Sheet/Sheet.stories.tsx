import type { Meta, StoryObj } from "@storybook/react-vite";
import { converter } from "culori";
import type { ReactNode } from "react";
import { expect } from "storybook/test";
import { colour } from "../../../.storybook/canvas-colour.ts";
import { faintHovers } from "../../../.storybook/hover-step.ts";
import { Amount } from "../Amount/Amount.tsx";
import { Heading } from "../Heading/Heading.tsx";
import { Stack } from "../Stack/Stack.tsx";
import { StatusTag } from "../StatusTag/StatusTag.tsx";
import { Text } from "../Text/Text.tsx";
import { Sheet } from "./Sheet.tsx";

const oklch = converter("oklch");

const panel = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLDialogElement>('[data-component="Sheet"]')!;

// Style expectations (ADR 0012) every story holds: an open modal dialog that
// has taken focus; at the end edge, full height, the sheet width or the whole
// of a narrower window; a surface's padding and radius on the corners facing
// the page only; the overlay surface and shadow, and no border; the view
// transition name it slides in and out on (ADR 0011); and a close button the
// density's control height square, in the header's top row.
async function holdsPlaceAndShape(
  canvas: HTMLElement,
  { theme, density }: { theme: string; density: string }
) {
  const sheet = panel(canvas);
  await expect(sheet.matches(":modal")).toBe(true);
  await expect(document.activeElement).toBe(sheet);

  const box = sheet.getBoundingClientRect();
  await expect(box.right).toBe(window.innerWidth);
  await expect([box.top, box.height]).toEqual([0, window.innerHeight]);
  await expect(box.width).toBe(Math.min(420, window.innerWidth));

  const style = getComputedStyle(sheet);
  const padding = density === "contractor" ? "24px" : "20px";
  await expect([
    style.paddingTop,
    style.paddingRight,
    style.paddingBottom,
    style.paddingLeft,
  ]).toEqual([padding, padding, padding, padding]);
  const radius = density === "contractor" ? "12px" : "8px";
  await expect([
    style.borderTopLeftRadius,
    style.borderBottomLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
  ]).toEqual([radius, radius, "0px", "0px"]);
  await expect(style.boxShadow).not.toBe("none");
  await expect(style.borderTopWidth).toBe("0px");
  // The overlay surface, which in dark is a step lighter than the raised
  // bars and toasts it floats above (#252).
  const role = (name: string) =>
    style.getPropertyValue(`--ds-color-bg-${name}`);
  await expect(colour(style.backgroundColor)).toBe(
    colour(role("surface-overlay"))
  );
  if (theme === "dark") {
    await expect(oklch(style.backgroundColor)!.l).toBeGreaterThan(
      oklch(role("surface-raised"))!.l
    );
  }
  await expect(style.viewTransitionName).toBe("row-detail");
  await expect(
    getComputedStyle(sheet, "::backdrop").backgroundColor
  ).not.toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/);

  const control = density === "contractor" ? 44 : 32;
  const close = sheet
    .querySelector('[data-component="IconButton"]')!
    .getBoundingClientRect();
  await expect([close.width, close.height]).toEqual([control, control]);
  await expect(close.top).toBe(box.top + parseFloat(padding));
  await expect(close.right).toBe(box.right - parseFloat(padding));
  // The close button's hover shows on the sheet's surface (#250).
  await expect(
    faintHovers([sheet.querySelector('[data-component="IconButton"]')!])
  ).toEqual([]);
}

// A label and its value on one row, as a Sheet's body lays out a row's facts.
// A value too long for the row wraps under its label, one 4px step below it,
// nearer its own label than the next fact's 8px.
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" justify="between" gap="3xs">
      <Text tone="muted" text={label} />
      {children}
    </Stack>
  );
}

const meta = {
  title: "Components/Sheet",
  component: Sheet,
  // The sheet is a modal dialog over the whole window; the canvas fills the
  // window, with none of Storybook's padding, so the gate's shots of the
  // story root hold all of it, end edge included.
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="min-h-dvh">
        <Story />
      </div>
    ),
  ],
  play: ({ canvasElement, globals }) =>
    holdsPlaceAndShape(canvasElement, {
      theme: globals.theme,
      density: globals.density,
    }),
} satisfies Meta<typeof Sheet>;

export default meta;

type Story = StoryObj<typeof meta>;

const invoice = {
  closeLabel: "Close invoice details",
  title: <Heading level={2} text="INV-0148" />,
  children: (
    <>
      <Stack direction="row" justify="between" gap="sm">
        <Amount value={6375.5} currency="USD" display="card" />
        <StatusTag status="awaiting" />
      </Stack>
      <Stack gap="2xs">
        <Fact label="Contractor">
          <Text text="Priya Raman" />
        </Fact>
        <Fact label="Client">
          <Text text="Northwind Logistics & Freight Holdings Ltd." />
        </Fact>
        <Fact label="Due">
          <Text text="Nov 2" />
        </Fact>
        <Fact label="Lines">
          <Text text="4 lines" />
        </Fact>
      </Stack>
    </>
  ),
};

// An invoice row opened from the overdue-invoices or my-invoices table: the
// amount and its status first, then the facts the row had no room for.
export const Invoice: Story = { args: invoice };

// A payment run opened from run-history: the run's total, then each group
// under its own level 3 heading.
export const PaymentRun: Story = {
  args: {
    closeLabel: "Close payment run details",
    title: <Heading level={2} text="Oct 24 run" />,
    children: (
      <>
        <Stack direction="row" justify="between" gap="sm">
          <Amount value={9465.5} currency="USD" display="card" />
          <StatusTag status="scheduled" />
        </Stack>
        <Stack gap="2xs">
          <Heading level={3} text="Due in this run" />
          <Fact label="4 invoices">
            <Amount value={7845.5} currency="USD" display="table" />
          </Fact>
        </Stack>
        <Stack gap="2xs">
          <Heading level={3} text="Overdue" />
          <Fact label="1 invoice">
            <Amount value={1620} currency="USD" display="table" />
          </Fact>
        </Stack>
      </>
    ),
  },
};

// A contractor opened from the contractors table, whose name runs long: the
// title wraps beside the close button, which stays at the top.
export const LongTitle: Story = {
  args: {
    closeLabel: "Close contractor details",
    title: (
      <Heading level={2} text="Jonah Whitfield-Abernathy, Abernathy Studio" />
    ),
    children: (
      <Stack gap="2xs">
        <Fact label="Country">
          <Text text="Ireland" />
        </Fact>
        <Fact label="Open invoices">
          <Text text="2 invoices" />
        </Fact>
        <Fact label="Owed">
          <Amount value={2600} currency="USD" display="table" />
        </Fact>
      </Stack>
    ),
  },
};

// The invoice on a contractor's phone: the sheet takes the whole width.
export const Phone: Story = { args: invoice, tags: ["phone"] };
