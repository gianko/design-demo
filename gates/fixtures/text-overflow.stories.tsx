import type { Meta, StoryObj } from "@storybook/react-vite";

// A label stuck to the top of a box a row high, over dates scrolled to the
// end, so the second date lies under the label.
function StuckDates({ fill }: { fill: boolean }) {
  return (
    <div
      className="h-row w-4xl overflow-auto"
      ref={(box) => {
        if (box) box.scrollTop = box.scrollHeight;
      }}
    >
      <p className={fill ? "sticky top-0 bg-surface" : "sticky top-0"}>Due</p>
      <p>Oct 24</p>
      <p>Nov 2</p>
      <p>Dec 1</p>
    </div>
  );
}

// Dates in a box a row high, scrolled to the top, so the later ones lie
// past its bottom edge, out of view, and a note right below the box, where
// the hidden dates would be: as a capped DataTable's footer sits under rows
// scrolled out of its body (ADR 0013).
function ScrolledPastNote() {
  return (
    <div>
      <div className="h-row w-4xl overflow-auto">
        <p>Oct 24</p>
        <p>Nov 2</p>
        <p>Dec 1</p>
        <p>Jan 5</p>
      </div>
      <p>3 invoices selected</p>
    </div>
  );
}

// text-overflow (lint/taste/RULES.md), one failure per story. Spill: an IBAN
// with no break opportunity runs out of a narrow column, and a long label
// wraps out of the bottom of a fixed-height control. Clip: a long name cut
// off by `overflow: hidden` with no ellipsis. Collide: two labels painted
// over each other. Stuck: a list scrolled to its end under a stuck label with
// no fill, so the dates show through it. Pass: the same content truncated
// with an ellipsis, broken anywhere, or given room, a visually hidden status
// region, as Screen renders one, whose copy runs past its 1px box because no
// one sees it, a modal dialog, as a Sheet opens, whose text covers the page's
// behind it rather than colliding with it, and the stuck label with an
// opaque fill, as a long DataTable's header row has, which covers the dates
// scrolling under it, and a note below dates scrolled out of their box, which
// don't show where the note is.
const meta = {
  title: "GateFixtures/TextOverflow",
  args: { variant: "pass" },
  render: ({ variant }) => (
    <div className="flex flex-col items-start gap-sm bg-page p-page text-body text-ink">
      {variant === "spill" && (
        <>
          <p className="w-4xl">DE89370400440532013000</p>
          <span className="flex h-control w-4xl items-center rounded-control bg-surface px-control text-label">
            Approve and pay all overdue invoices
          </span>
        </>
      )}
      {variant === "clip" && (
        <p className="w-4xl overflow-hidden whitespace-nowrap">
          Northwind Logistics GmbH
        </p>
      )}
      {variant === "stuck" && <StuckDates fill={false} />}
      {variant === "collide" && (
        <div className="relative h-control w-4xl">
          <span className="absolute inset-0">Awaiting</span>
          <span className="absolute inset-0">Paid</span>
        </div>
      )}
      {variant === "pass" && (
        <>
          <p className="w-4xl break-all">DE89370400440532013000</p>
          <span className="flex items-center rounded-control bg-surface px-control py-3xs text-label">
            Approve and pay all overdue invoices
          </span>
          <p className="w-4xl truncate">Northwind Logistics GmbH</p>
          <div className="flex gap-2xs">
            <span>Awaiting</span>
            <span>Paid</span>
          </div>
          <div role="status" className="sr-only">
            <p>Reminder sent to Northwind. We'll tell you when they pay.</p>
          </div>
          <dialog
            aria-label="Invoice details"
            className="m-0 border-0 bg-surface p-page text-body text-ink backdrop:bg-scrim"
            ref={(dialog) => {
              if (dialog && !dialog.open) dialog.showModal();
            }}
          >
            <p>Invoice INV-0142, due Oct 24</p>
          </dialog>
          <StuckDates fill />
          <ScrolledPastNote />
        </>
      )}
    </div>
  ),
} satisfies Meta<{ variant: "pass" | "spill" | "clip" | "collide" | "stuck" }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Spill: StoryObj<typeof meta> = { args: { variant: "spill" } };

export const Clip: StoryObj<typeof meta> = { args: { variant: "clip" } };

export const Collide: StoryObj<typeof meta> = { args: { variant: "collide" } };

export const Stuck: StoryObj<typeof meta> = { args: { variant: "stuck" } };
