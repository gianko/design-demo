import type { ReactNode } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { screenEntry } from "./Screen.registry.ts";

// The screen root. Density is a CSS scope (ADR 0002): `audience` sets
// `data-density`, and every density token inside resolves under it, so the
// variant itself adds no class.
export const screen = tv({
  slots: { root: "bg-page p-page text-body text-ink" },
  variants: { audience: { admin: {}, contractor: {} } },
});

export type ScreenProps = PropsOf<typeof screenEntry> & {
  children?: ReactNode;
};

export function Screen({ audience, children }: ScreenProps) {
  const { root } = screen({ audience });
  return (
    <main data-component="Screen" data-density={audience} className={root()}>
      {children}
    </main>
  );
}
