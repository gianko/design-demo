import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactNode,
} from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import { Toast } from "../Toast/Toast.tsx";
import type { actionBarEntry } from "./ActionBar.registry.ts";
import { InActionBar } from "./in-action-bar.ts";

// The bulk-action bar (ADR 0011): a raised surface holding the action's
// Button, shown while rows are selected. It is sticky in the flow, so it sits
// under the table it acts on and floats above the window's bottom edge once
// the table runs past it. It hugs its Buttons at the end edge, where a row's
// actions go, rather than spreading an empty surface across the table's
// width. Raised means one soft shadow and no border, which
// dark draws as a hairline ring. It isn't interactive: its states are the
// screen's (shown or not, by `when`) and its Button's (pending while the
// action runs). Its motion is the library's View Transition: `vt-action-result`
// gives it the view transition name a success Toast shares, so a confirmed
// result morphs the bar into the toast, and src/styles.css times every change.
// In an action's failure state it also holds the failure Toast, as its first
// row above the Buttons, so the two stick as one on a long table (#243): the
// bar is then as wide as the Toast's measure or its Buttons, whichever is
// wider, and the Toast spans it.
export const actionBar = tv({
  slots: {
    root: "sticky bottom-sm z-raised ms-auto grid w-fit gap-xs rounded-surface bg-surface-raised p-2xs shadow-raised vt-action-result",
    actions: "flex flex-wrap items-center justify-end gap-xs",
  },
});

export type ActionBarProps = PropsOf<typeof actionBarEntry> & {
  children?: ReactNode;
};

// Every child, with fragments opened up, so a Toast is found wherever the
// screen puts it among the Buttons. A fragment's key prefixes its
// children's, so keys stay unique.
function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? flatten(child.props.children).map((inner) =>
          isValidElement(inner)
            ? cloneElement(inner, { key: `${child.key}${inner.key}` })
            : inner
        )
      : [child]
  );
}

export function ActionBar({ children }: ActionBarProps) {
  const { root, actions } = actionBar();
  const all = flatten(children);
  const isToast = (child: ReactNode) =>
    isValidElement(child) && child.type === Toast;
  const buttons = all.filter((child) => !isToast(child));
  return (
    <div data-component="ActionBar" className={root()}>
      <InActionBar value>
        {all.filter(isToast)}
        {buttons.length > 0 && <div className={actions()}>{buttons}</div>}
      </InActionBar>
    </div>
  );
}
