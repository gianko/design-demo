import type { ReactNode } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { pageHeaderEntry } from "./PageHeader.registry.ts";

// The top of a screen: its title, with a line of context under it, and the
// screen's actions at the end of the same row. The title is a Heading in a
// slot, not a string, so the UI spec's heading outline includes it. It paints
// nothing and has no states or motion of its own. The row wraps, so on a
// phone the actions move under a long title instead of squeezing it; a title
// that fits beside them takes whatever room they leave.
export const pageHeader = tv({
  slots: {
    root: "flex flex-wrap items-center justify-between gap-sm",
    heading: "flex grow flex-col gap-3xs",
    actions: "flex flex-wrap items-center gap-2xs",
  },
});

export type PageHeaderProps = PropsOf<typeof pageHeaderEntry> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const slots = pageHeader();
  return (
    <header data-component="PageHeader" className={slots.root()}>
      <div className={slots.heading()}>
        {title}
        {description}
      </div>
      {actions && <div className={slots.actions()}>{actions}</div>}
    </header>
  );
}
