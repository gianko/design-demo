import { useState, type ReactNode } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import { useStateEntry } from "../Screen/screen-state.tsx";
import type { cardEntry } from "./Card.registry.ts";

// A flat surface: a `line` hairline and the density's surface radius, never a
// shadow, since a shadow means "this floats". It isn't interactive, so it has
// no states and no motion of its own. The parts sit apart by one gap; the
// body is wrapped so several children read as one part, and the header and
// footer render only when given. Its width has a ceiling, so a lone Card in a
// wide column sits at the start rather than spreading its rows across it.
//
// An action's result, a Notice, sits in `result`: a full-width strip along
// the bottom edge, outside the padding, under a `line` hairline (ADR 0016).
// So the root is the frame and `content` holds the padding, always, so a
// Card with no result looks as it always has and one that gains or loses a
// result keeps its header, body and footer elements.
export const card = tv({
  slots: {
    root: "flex max-w-card flex-col rounded-surface border border-line bg-surface",
    content: "flex flex-col gap-md p-surface",
    header: "",
    body: "",
    footer: "",
    result: "border-t border-line",
  },
});

// The Card's part in a screen-state change's View Transition (ADR 0016,
// src/styles.css). While it holds a Notice it is the group `card-result`,
// whose height animates while its images stay pinned to the top and
// clipped. It is that group on both sides of the change that brings the
// Notice in, named in the old view by its footer's pending Button (the
// action whose result the Notice is), and of the change that takes it out,
// named in the state it lost the Notice in, with the `closing` class, which
// runs the exit timing. Not tv() variants: Card is one look, and its Figma
// set has no axis for a transition.
const transition = {
  rest: "has-aria-busy:vt-card-result",
  holding: "vt-card-result",
  closing: "vt-card-result closing-transition",
};

export type CardProps = PropsOf<typeof cardEntry> & {
  header?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  result?: ReactNode;
};

export function Card({ header, children, footer, result }: CardProps) {
  const slots = card();
  const holds = Boolean(result);
  // The state entry in which it last lost its Notice.
  const entry = useStateEntry();
  const [held, setHeld] = useState(holds);
  const [lostAt, setLostAt] = useState<number | null>(null);
  if (held !== holds) {
    setHeld(holds);
    setLostAt(holds ? null : entry);
  }
  const part = holds
    ? transition.holding
    : lostAt === entry
      ? transition.closing
      : transition.rest;
  return (
    <div data-component="Card" className={slots.root({ class: part })}>
      <div className={slots.content()}>
        {header && <div className={slots.header()}>{header}</div>}
        <div className={slots.body()}>{children}</div>
        {footer && <div className={slots.footer()}>{footer}</div>}
      </div>
      {result && <div className={slots.result()}>{result}</div>}
    </div>
  );
}
