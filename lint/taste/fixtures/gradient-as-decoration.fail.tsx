import { tv } from "tailwind-variants/lite";

// Gradients planted where a class-attribute check would miss them: in tv()
// slots and variants, under variant prefixes, as arbitrary values, as
// Tailwind 3's class and in a template literal.
export const banner = tv({
  slots: {
    root: "flex bg-linear-to-r", // ✗ taste/gradient-as-decoration
    halo: "bg-radial", // ✗ taste/gradient-as-decoration
    ring: "bg-conic-180", // ✗ taste/gradient-as-decoration
    title: "text-heading bg-clip-text", // ✗ taste/gradient-as-decoration
  },
  variants: {
    loud: {
      true: {
        root: "hover:from-accent", // ✗ taste/gradient-as-decoration
        halo: "via-surface", // ✗ taste/gradient-as-decoration
        ring: "data-[state=open]:to-progress", // ✗ taste/gradient-as-decoration
      },
    },
  },
});

export function Wash({ label, old }: { label: string; old: boolean }) {
  return (
    <div className={`p-md ${old ? "bg-gradient-to-b" : "bg-surface"}`}> {/* ✗ taste/gradient-as-decoration */}
      <span className="bg-[linear-gradient(90deg,var(--ds-color-accent),transparent)]">{label}</span> {/* ✗ taste/gradient-as-decoration */}
      <span className="[background-clip:text]">{label}</span> {/* ✗ taste/gradient-as-decoration */}
    </div>
  );
}
