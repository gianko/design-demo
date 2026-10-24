import { useCallback, useState, type ReactNode } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import { AnnounceContext } from "./announce.ts";
import type { screenEntry } from "./Screen.registry.ts";
import { useCurrentScreenState } from "./screen-state.tsx";

// The screen root. Density is a CSS scope (ADR 0002): `audience` sets
// `data-density`, and every density token inside resolves under it, so the
// variant itself adds no class. `status` is the screen's one live region,
// visually hidden, filled through `announce` (./announce.ts). The current
// screen state comes from the ScreenHost around the screen
// (./screen-state.tsx), not a prop, so the UI spec never sets it.
export const screen = tv({
  slots: { root: "bg-page p-page text-body text-ink", status: "sr-only" },
  variants: { audience: { admin: {}, contractor: {} } },
});

export type ScreenProps = PropsOf<typeof screenEntry> & {
  children?: ReactNode;
};

export function Screen({ audience, children }: ScreenProps) {
  const { root, status } = screen({ audience });
  // Each announcement is a new node in the region, keyed by its count, so
  // copy that repeats the last announcement is added again, and announced
  // again, rather than written over itself.
  const [announcement, setAnnouncement] = useState({ text: "", count: 0 });
  const announce = useCallback(
    (text: string) =>
      setAnnouncement(({ count }) => ({ text, count: count + 1 })),
    []
  );
  const state = useCurrentScreenState();
  return (
    <main
      data-component="Screen"
      data-density={audience}
      data-screen-state={state}
      className={root()}
    >
      <AnnounceContext value={announce}>{children}</AnnounceContext>
      <div role="status" className={status()}>
        {announcement.text && (
          <span key={announcement.count}>{announcement.text}</span>
        )}
      </div>
    </main>
  );
}
