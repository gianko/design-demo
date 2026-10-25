import type { ReactNode } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { stackEntry } from "./Stack.registry.ts";

// Layout only: a flex column or row with a gap from the spacing tokens. It
// paints nothing, so it sits on whatever surface holds it. A row always wraps,
// so a long name on a phone pushes its neighbour down instead of spilling.
// Each gap class is written out whole, so Tailwind finds it in this file.
export const stack = tv({
  slots: { root: "flex" },
  variants: {
    direction: {
      column: { root: "flex-col" },
      row: { root: "flex-row flex-wrap" },
    },
    gap: {
      "0": { root: "gap-0" },
      "3xs": { root: "gap-3xs" },
      "2xs": { root: "gap-2xs" },
      xs: { root: "gap-xs" },
      sm: { root: "gap-sm" },
      md: { root: "gap-md" },
      lg: { root: "gap-lg" },
      xl: { root: "gap-xl" },
      "2xl": { root: "gap-2xl" },
      "3xl": { root: "gap-3xl" },
      "4xl": { root: "gap-4xl" },
    },
    align: {
      stretch: { root: "items-stretch" },
      start: { root: "items-start" },
      center: { root: "items-center" },
      baseline: { root: "items-baseline" },
    },
    justify: {
      start: { root: "justify-start" },
      between: { root: "justify-between" },
      end: { root: "justify-end" },
    },
  },
  defaultVariants: { direction: "column", gap: "sm", justify: "start" },
});

export type StackProps = PropsOf<typeof stackEntry> & { children?: ReactNode };

export function Stack({
  direction = "column",
  gap,
  align,
  justify,
  children,
}: StackProps) {
  // The cross-axis default follows the direction: a column stretches so a
  // Card fills its width, and a row centres so mixed heights line up.
  const { root } = stack({
    direction,
    gap,
    align: align ?? (direction === "row" ? "center" : "stretch"),
    justify,
  });
  return (
    <div data-component="Stack" className={root()}>
      {children}
    </div>
  );
}
