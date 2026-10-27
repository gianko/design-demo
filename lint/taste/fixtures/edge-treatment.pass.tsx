import { tv } from "tailwind-variants/lite";

// Flat surfaces with a `line` hairline, a floating bar with a shadow and no
// border, a border colour on a slot whose shadow lives on another, and copy
// that merely mentions the classes.
export const card = tv({
  slots: {
    root: "rounded-surface border border-line bg-surface p-surface",
    // One-sided hairlines, however the width is written.
    row: "border-t border-line",
    cell: "border-e border-b-px border-s-0 border-l-[1px] border-line",
    bar: "sticky bottom-0 bg-surface-raised shadow-raised",
    // The focus ring is an outline, not a shadow, and a ring colour or a
    // zero ring draws nothing.
    control: "border border-control focus-visible:focus-ring ring-0",
  },
});

// The bar trades its hairline for a shadow when it floats: the border is
// gone under the same variant that adds the shadow.
export const bar = tv({
  base: "border-t border-line bg-surface data-[floating]:border-0 data-[floating]:shadow-raised",
});

export function Note() {
  return (
    <p className="border-transparent text-body" title="no shadow-raised here">
      A border and a shadow-raised are named here, not applied.
    </p>
  );
}
