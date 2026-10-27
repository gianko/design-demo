import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../../src/components/Card/Card.tsx";
import { Heading } from "../../src/components/Heading/Heading.tsx";
import { Sheet } from "../../src/components/Sheet/Sheet.tsx";

// Opens a popover as it mounts, so it renders in the top layer.
function showPopover(element: HTMLElement | null) {
  if (element && !element.matches(":popover-open")) element.showPopover();
}

// nested-cards (lint/taste/RULES.md) at render time. No failing story writes
// a `<Card>` in a `<Card>`, so the static rule can't see them. Border: a
// hand-built bordered panel inside a Card. Shadow: a raised box inside a
// surface painted by its fill alone. CardInSheet: a bordered panel inside an
// open Sheet, which is a surface of its own wherever it sits in the DOM.
// Pass: inside a Card, what isn't a card: a control with its own border, a
// fill without an edge, a hairline divider; and beside it, a second surface
// on the page, not inside the first. SheetInCard: an open Sheet rendered
// inside a Card's element, as a DataTable could render a row's; the Sheet is
// a modal dialog in the top layer, drawn over the page, not inside the Card.
// PopoverInCard: a bordered panel in an open popover rendered inside a Card's
// element; the popover is in the top layer too, so the panel is inside the
// popover, an unrounded fill that is no surface, and not inside the Card.
const meta = {
  title: "GateFixtures/NestedCards",
  args: { variant: "pass" },
  render: ({ variant }) => (
    <div className="flex flex-col items-start gap-sm bg-page p-page text-body text-ink">
      {variant === "border" && (
        <Card>
          <div className="rounded-surface border border-line p-surface">
            <p>Northwind Logistics</p>
          </div>
        </Card>
      )}
      {variant === "shadow" && (
        <div className="rounded-surface bg-surface p-surface">
          <div className="rounded-surface bg-surface p-surface shadow-raised">
            <p>Next payment</p>
          </div>
        </div>
      )}
      {variant === "pass" && (
        <>
          <Card
            footer={
              <button
                type="button"
                className="h-control rounded-control border border-control bg-surface px-control text-label text-ink"
              >
                Send reminder
              </button>
            }
          >
            <div className="flex flex-col gap-xs">
              <p className="rounded-tag bg-selected p-xs">
                INV-0142, due Oct 8
              </p>
              <p className="border-t border-line pt-xs">Northwind Logistics</p>
            </div>
          </Card>
          <div className="rounded-surface border border-line bg-surface p-surface">
            <p>Paid this year</p>
          </div>
        </>
      )}
      {(variant === "sheet-in-card" || variant === "card-in-sheet") && (
        <Card>
          <p>Northwind Logistics</p>
          <Sheet
            closeLabel="Close invoice details"
            title={<Heading level={2} text="INV-0142" />}
          >
            {variant === "sheet-in-card" ? (
              <p>Approved by Ada Lovelace</p>
            ) : (
              <div className="rounded-surface border border-line p-surface">
                <p>Approved by Ada Lovelace</p>
              </div>
            )}
          </Sheet>
        </Card>
      )}
      {variant === "popover-in-card" && (
        <Card>
          <p>Northwind Logistics</p>
          <div
            popover="manual"
            ref={showPopover}
            className="bg-surface text-ink"
          >
            <div className="rounded-surface border border-line bg-surface p-surface">
              <p>Payment terms: net 30</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  ),
} satisfies Meta<{
  variant:
    | "pass"
    | "border"
    | "shadow"
    | "sheet-in-card"
    | "card-in-sheet"
    | "popover-in-card";
}>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Border: StoryObj<typeof meta> = { args: { variant: "border" } };

export const Shadow: StoryObj<typeof meta> = { args: { variant: "shadow" } };

export const SheetInCard: StoryObj<typeof meta> = {
  args: { variant: "sheet-in-card" },
};

export const CardInSheet: StoryObj<typeof meta> = {
  args: { variant: "card-in-sheet" },
};

export const PopoverInCard: StoryObj<typeof meta> = {
  args: { variant: "popover-in-card" },
};
