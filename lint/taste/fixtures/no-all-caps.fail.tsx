import { tv } from "tailwind-variants/lite";

// Capitals set by a class, where a class-attribute check would miss them:
// under a variant prefix, with `!`, as an arbitrary property, in a tv() slot
// and in a template literal.
export const column = tv({
  slots: {
    root: "text-caption text-muted",
    header: "text-label uppercase", // ✗ taste/no-all-caps
  },
  variants: {
    open: { true: { root: "data-[state=open]:uppercase" } }, // ✗ taste/no-all-caps
  },
});

export function Eyebrow({ label, loud }: { label: string; loud: boolean }) {
  return (
    <span className={`text-caption ${loud ? "!uppercase" : ""}`}> {/* ✗ taste/no-all-caps */}
      <span className="[text-transform:uppercase]">{label}</span> {/* ✗ taste/no-all-caps */}
    </span>
  );
}
