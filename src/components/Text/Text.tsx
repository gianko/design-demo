import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { textEntry } from "./Text.registry.ts";

// A run of plain copy. `live` is a role, not a look: it makes the paragraph a
// polite status region that announces an action's result, and adds no class.
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
  return (
    <p
      data-component="Text"
      role={live ? "status" : undefined}
      className={root()}
    >
      {copy}
    </p>
  );
}
