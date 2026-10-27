import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { emptyStateEntry } from "./EmptyState.registry.ts";

// What a list shows in its empty screen state: why it's empty and, where it
// helps, what will appear there. It stands where the DataTable would, on the
// same flat surface the table draws, so the empty list keeps its outline. The
// reason leads by weight, at body size, and the line under it is muted. Both
// are paragraphs, not a heading, so the empty state adds nothing to the
// screen's outline. It isn't interactive and has no motion of its own: it
// enters and leaves with its screen state's View Transition.
export const emptyState = tv({
  slots: {
    root: "flex flex-col gap-3xs rounded-surface border border-line bg-surface p-surface",
    title: "max-w-measure text-label text-ink",
    text: "max-w-measure text-body text-ink-muted",
  },
});

export type EmptyStateProps = PropsOf<typeof emptyStateEntry>;

export function EmptyState({ title, text }: EmptyStateProps) {
  const slots = emptyState();
  return (
    <div data-component="EmptyState" className={slots.root()}>
      <p className={slots.title()}>{title}</p>
      {text && <p className={slots.text()}>{text}</p>}
    </div>
  );
}
