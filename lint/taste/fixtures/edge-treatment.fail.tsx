import { tv } from "tailwind-variants/lite";

// A border and a shadow on one slot, planted where a class-attribute check
// would miss them: split between a slot's base and one of its variants, and
// behind a variant prefix in a plain class list.
export const panel = tv({
  slots: {
    root: "rounded-surface border border-line bg-surface",
    body: "p-surface",
  },
  variants: {
    floating: { true: { root: "shadow-raised" } }, // ✗ taste/edge-treatment
  },
});

// A shadow drawing the edge a border should: a ring, inset or not, with or
// without a width.
export const field = tv({
  slots: {
    root: "rounded-control bg-surface ring ring-focus", // ✗ taste/edge-treatment
    hint: "data-[invalid]:inset-ring-1", // ✗ taste/edge-treatment
  },
});

// A status stripe down one side of a row, physical or logical, by number or
// by arbitrary length.
export const row = tv({
  base: "h-row border-t border-line",
  variants: {
    status: {
      overdue: "border-l-4 border-overdue", // ✗ taste/edge-treatment
      failed: "data-[flagged]:border-s-2", // ✗ taste/edge-treatment
      paid: "border-b-[3px]", // ✗ taste/edge-treatment
    },
  },
});

export function Tile({ label }: { label: string }) {
  return (
    <div className="border border-line hover:shadow-overlay"> {/* ✗ taste/edge-treatment */}
      <span className="focus-visible:inset-ring">{label}</span> {/* ✗ taste/edge-treatment */}
    </div>
  );
}
