import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../../src/components/Card/Card.tsx";

// nested-cards (lint/taste/RULES.md) at render time. Neither failing story
// writes a `<Card>` in a `<Card>`, so the static rule can't see them. Border:
// a hand-built bordered panel inside a Card. Shadow: a raised box inside a
// surface painted by its fill alone. Pass: inside a Card, what isn't a card:
// a control with its own border, a fill without an edge, a hairline divider;
// and beside it, a second surface on the page, not inside the first.
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
    </div>
  ),
} satisfies Meta<{ variant: "pass" | "border" | "shadow" }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Border: StoryObj<typeof meta> = { args: { variant: "border" } };

export const Shadow: StoryObj<typeof meta> = { args: { variant: "shadow" } };
