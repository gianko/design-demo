import { useLayoutEffect, useRef, type ReactNode } from "react";

// Focus as the library leaves it once a state change has run (#244): the
// first of `component` inside takes focus before the first paint, as it
// does when the state that shows it removes the focused element.
export function FocusedOn({
  component,
  children,
}: {
  component: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref
      .current!.querySelector<HTMLElement>(`[data-component="${component}"]`)!
      .focus({ preventScroll: true });
  }, [component]);
  return <div ref={ref}>{children}</div>;
}
