import type { Ref } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { checkboxEntry } from "./Checkbox.registry.ts";

// The row selector DataTable renders. The native input takes the click, the
// focus and the target-size check, so it fills the root, a square at the
// density's minimum target, with its own look removed; the box drawn after it
// follows its hover, press and focus through `peer-*`. Checked and mixed fill
// the box with the accent, the one colour for selection, and draw a tick or a
// dash, so the state never rests on colour alone. The edge goes transparent
// rather than away, so the box keeps its size. Disabled keeps the shape and
// drains the colour, as Button's does: an empty box keeps its edge, a filled
// one only its fill.
export const checkbox = tv({
  slots: {
    root: "relative inline-flex aspect-square min-h-target items-center justify-center",
    // The box draws the focus ring, so the input draws none of its own.
    input: "peer absolute inset-0 appearance-none outline-none",
    box: "size-icon rounded-tag border transition-colors duration-fast ease-standard peer-focus-visible:focus-ring",
    mark: "pointer-events-none absolute size-icon",
    // The accessible name: in a table the row says what it is, so it's
    // read, not shown.
    name: "sr-only",
  },
  variants: {
    checked: {
      false: {},
      true: { box: "border-transparent bg-accent" },
      mixed: { box: "border-transparent bg-accent" },
    },
    disabled: {
      true: { mark: "text-disabled" },
      false: { mark: "text-on-accent" },
    },
  },
  compoundVariants: [
    {
      checked: false,
      disabled: false,
      // Hover and pressed are translucent ink, laid over the box's
      // `surface` fill on a `::before` rounded like it, so hover is a step from
      // rest on any surface rather than the fill giving way. Positioned, the
      // box would sit over the input, so it lets the pointer through to it.
      class: {
        box: "pointer-events-none relative border-control bg-surface before:absolute before:inset-0 before:rounded-tag before:transition-colors before:duration-fast before:ease-standard peer-hover:before:bg-surface-hover peer-active:before:bg-surface-pressed",
      },
    },
    {
      checked: [true, "mixed"],
      disabled: false,
      class: {
        box: "peer-hover:bg-accent-hover peer-active:bg-accent-pressed",
      },
    },
    {
      checked: false,
      disabled: true,
      class: { box: "border-disabled bg-surface" },
    },
    { checked: [true, "mixed"], disabled: true, class: { box: "bg-disabled" } },
  ],
  defaultVariants: { checked: false, disabled: false },
});

export type CheckboxProps = PropsOf<typeof checkboxEntry> & {
  onCheckedChange?: (checked: boolean) => void;
  ref?: Ref<HTMLInputElement>;
};

// A tick and a dash on the box's 16-unit grid, stroked in the mark's colour.
const marks = { true: "M4 8.25 6.75 11 12 5.5", mixed: "M4.5 8h7" } as const;

export function Checkbox({
  label,
  checked = false,
  disabled = false,
  onCheckedChange,
  ref,
}: CheckboxProps) {
  const slots = checkbox({ checked, disabled });
  return (
    <label data-component="Checkbox" className={slots.root()}>
      <input
        // Mixed is a DOM property, not an attribute. A new callback each
        // render, so React calls it again and the property follows `checked`.
        ref={(node) => {
          if (node) node.indeterminate = checked === "mixed";
          if (typeof ref === "function") return ref(node);
          if (ref) ref.current = node;
        }}
        type="checkbox"
        className={slots.input()}
        // Controlled: DataTable owns selection, so a click reports the change
        // and the box shows what `checked` says.
        checked={checked === true}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
      <span aria-hidden className={slots.box()} />
      {checked !== false && (
        <svg
          aria-hidden
          className={slots.mark()}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={marks[checked === true ? "true" : "mixed"]} />
        </svg>
      )}
      <span className={slots.name()}>{label}</span>
    </label>
  );
}
