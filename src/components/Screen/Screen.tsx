import { useState, type ReactNode } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import { AnnounceContext } from "./announce.ts";
import type { screenEntry } from "./Screen.registry.ts";

// The screen root. Density is a CSS scope (ADR 0002): `audience` sets
// `data-density`, and every density token inside resolves under it, so the
// variant itself adds no class. `status` is the screen's one live region,
// visually hidden, filled through `announce` (./announce.ts).
export const screen = tv({
  slots: { root: "bg-page p-page text-body text-ink", status: "sr-only" },
  variants: { audience: { admin: {}, contractor: {} } },
});

export type ScreenProps = PropsOf<typeof screenEntry> & {
  children?: ReactNode;
};

export function Screen({ audience, children }: ScreenProps) {
  const { root, status } = screen({ audience });
  const [announcement, announce] = useState("");
  return (
    <main data-component="Screen" data-density={audience} className={root()}>
      <AnnounceContext value={announce}>{children}</AnnounceContext>
      <div role="status" className={status()}>
        {announcement}
      </div>
    </main>
  );
}
