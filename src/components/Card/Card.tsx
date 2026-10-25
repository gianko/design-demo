import type { ReactNode } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { cardEntry } from "./Card.registry.ts";

// A flat surface: a `line` hairline and the density's surface radius, never a
// shadow, since a shadow means "this floats". It isn't interactive, so it has
// no states and no motion of its own. The parts sit apart by one gap; the
// body is wrapped so several children read as one part, and the header and
// footer render only when given.
export const card = tv({
  slots: {
    root: "flex flex-col gap-md rounded-surface border border-line bg-surface p-lg",
    header: "",
    body: "",
    footer: "",
  },
});

// Zod infers an empty props object as Record<string, never>, whose index
// signature would forbid the slot props, so only its named keys are kept.
type EntryProps = PropsOf<typeof cardEntry>;
type NamedEntryProps = {
  [K in keyof EntryProps as string extends K ? never : K]: EntryProps[K];
};

export type CardProps = NamedEntryProps & {
  header?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
};

export function Card({ header, children, footer }: CardProps) {
  const slots = card();
  return (
    <div data-component="Card" className={slots.root()}>
      {header && <div className={slots.header()}>{header}</div>}
      <div className={slots.body()}>{children}</div>
      {footer && <div className={slots.footer()}>{footer}</div>}
    </div>
  );
}
