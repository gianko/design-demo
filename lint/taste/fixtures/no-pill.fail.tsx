import { tv } from "tailwind-variants/lite";

// Fully rounded corners planted where a class-attribute check would miss
// them: under variant prefixes, on one side only, in a tv() slot and in a
// template literal.
export const tag = tv({
  slots: {
    root: "inline-flex rounded-tag px-2xs text-caption",
    dot: "size-icon hover:rounded-full", // ✗ taste/no-pill
  },
  variants: {
    open: { true: { root: "data-[state=open]:rounded-s-full" } }, // ✗ taste/no-pill
  },
});

export function Chip({ label, wide }: { label: string; wide: boolean }) {
  return (
    <span className={`bg-surface ${wide ? "!rounded-full" : "rounded-tag"}`}> {/* ✗ taste/no-pill */}
      <span className="rounded-tl-full">{label}</span> {/* ✗ taste/no-pill */}
    </span>
  );
}
