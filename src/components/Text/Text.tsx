import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { textEntry } from "./Text.registry.ts";

// A run of plain copy, never an action's result: that is a Notice or a Toast,
// which announce themselves (ADR 0016). Body copy keeps a measure, a ceiling
// of about 65 characters a line, so a long paragraph on a wide screen still
// reads.
export const text = tv({
  slots: { root: "" },
  variants: {
    size: {
      body: { root: "max-w-measure text-body" },
      caption: { root: "text-caption" },
    },
    tone: { default: { root: "text-ink" }, muted: { root: "text-ink-muted" } },
  },
  defaultVariants: { size: "body", tone: "default" },
});

export type TextProps = PropsOf<typeof textEntry>;

export function Text({ text: copy, size, tone }: TextProps) {
  const { root } = text({ size, tone });
  return (
    <p data-component="Text" className={root()}>
      {copy}
    </p>
  );
}
