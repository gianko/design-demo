import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { headingEntry } from "./Heading.registry.ts";

// A title. Level picks both the element and the type role, one step down the
// scale per level, so the outline a screen reader hears is the one the eye
// sees. Level 3 is body size at 600, so it follows density as body text does.
export const heading = tv({
  slots: { root: "text-ink" },
  variants: {
    level: {
      "1": { root: "text-title" },
      "2": { root: "text-heading" },
      "3": { root: "text-label" },
    },
  },
});

export type HeadingProps = PropsOf<typeof headingEntry>;

const elements = { "1": "h1", "2": "h2", "3": "h3" } as const;

export function Heading({ text, level }: HeadingProps) {
  const { root } = heading({ level });
  const Element = elements[level];
  return (
    <Element data-component="Heading" className={root()}>
      {text}
    </Element>
  );
}
