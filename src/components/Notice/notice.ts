import { tv } from "tailwind-variants/lite";

// Notice's tv() config, in a module of its own so the registry entry reads it
// without loading Notice.tsx, React and the Phosphor glyphs: the generator
// loads entries under tsx on node. The strip is Card's bottom edge (ADR
// 0016): Card's `result` slot puts it outside the padding under a `line`
// hairline, and the strip paints itself, its bottom corners the surface
// radius. Its sides line up with the Card's content. The glyph sits in a box
// one line of copy tall, so it centres on the first line however far the
// copy wraps. The focus ring shows on keyboard focus only.
export const notice = tv({
  slots: {
    root: "flex items-start gap-xs rounded-b-surface px-surface py-sm text-body focus-visible:focus-ring",
    icon: "flex h-lh shrink-0 items-center",
    glyph: "size-icon",
    text: "",
  },
  variants: {
    tone: {
      success: { root: "bg-surface-raised text-ink" },
      failure: { root: "bg-error-inline text-error-inline" },
    },
  },
});
