import type { ReactNode } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { actionBarEntry } from "./ActionBar.registry.ts";
import "./ActionBar.css";

// The bulk-action bar (ADR 0011): a raised surface holding the action's
// Button, shown while rows are selected. It is sticky in the flow, so it sits
// under the table it acts on and floats above the window's bottom edge once
// the table runs past it. It hugs its Buttons at the end edge, where a row's
// actions go, rather than spreading an empty surface across the table's
// width. Raised means one soft shadow and no border, which
// dark draws as a hairline ring. It isn't interactive: its states are the
// screen's (shown or not, by `when`) and its Button's (pending while the
// action runs). Its motion is the library's View Transition: ActionBar.css
// gives it the view transition name Toast shares, so a confirmed result
// morphs the bar into the toast, and src/styles.css times every change.
export const actionBar = tv({
  slots: {
    root: "sticky bottom-sm z-raised ms-auto flex w-fit flex-wrap items-center justify-end gap-xs rounded-surface bg-surface-raised p-2xs shadow-raised",
  },
});

export type ActionBarProps = PropsOf<typeof actionBarEntry> & {
  children?: ReactNode;
};

export function ActionBar({ children }: ActionBarProps) {
  const { root } = actionBar();
  return (
    <div data-component="ActionBar" className={root()}>
      {children}
    </div>
  );
}
