import { useEffect } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import { useAnnounce } from "../Screen/announce.ts";
import type { textEntry } from "./Text.registry.ts";

// A run of plain copy. `live` is behaviour, not a look: the paragraph stays an
// ordinary one, and when it mounts (its screen state is entered) it hands its
// copy to the Screen's status region, which already exists, so the copy is
// announced as a change to that region. It adds no class.
export const text = tv({
  slots: { root: "" },
  variants: {
    size: { body: { root: "text-body" }, caption: { root: "text-caption" } },
    tone: { default: { root: "text-ink" }, muted: { root: "text-ink-muted" } },
  },
  defaultVariants: { size: "body", tone: "default" },
});

export type TextProps = PropsOf<typeof textEntry>;

export function Text({ text: copy, size, tone, live }: TextProps) {
  const { root } = text({ size, tone });
  const announce = useAnnounce();
  useEffect(() => {
    if (live) announce(copy);
  }, [live, copy, announce]);
  return (
    <p data-component="Text" className={root()}>
      {copy}
    </p>
  );
}
