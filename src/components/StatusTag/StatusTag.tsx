import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { statusTagEntry } from "./StatusTag.registry.ts";

// An invoice's status. StatusTag owns the word as well as the colour, so the
// two can't disagree and a bound status always reads in words, never colour
// alone. Every status is a tint with its own ink, except failed, the one
// solid fill. The tag is as tall as its line, so it sits in a row of text.
export const statusTag = tv({
  slots: { root: "inline-block rounded-tag px-2xs text-label" },
  variants: {
    status: {
      awaiting: { root: "bg-awaiting text-awaiting" },
      overdue: { root: "bg-overdue text-overdue" },
      paid: { root: "bg-paid text-paid" },
      scheduled: { root: "bg-scheduled text-scheduled" },
      failed: { root: "bg-failed text-failed" },
    },
  },
});

export type StatusTagProps = PropsOf<typeof statusTagEntry>;

// The brief's own words, from its table of status colours.
const words = {
  awaiting: "Awaiting",
  overdue: "Overdue",
  paid: "Paid",
  scheduled: "Scheduled",
  failed: "Failed",
} as const satisfies Record<StatusTagProps["status"], string>;

export function StatusTag({ status }: StatusTagProps) {
  const { root } = statusTag({ status });
  return (
    <span data-component="StatusTag" className={root()}>
      {words[status]}
    </span>
  );
}
