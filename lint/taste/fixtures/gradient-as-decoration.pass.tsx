import { tv } from "tailwind-variants/lite";

// Flat fills, utilities that merely start like a gradient stop, and copy
// that mentions gradients.
export const banner = tv({
  slots: {
    root: "relative top-0 origin-left touch-none bg-surface",
    edge: "bg-accent bg-clip-padding",
  },
});

export function Note({ label }: { label: string }) {
  return (
    <p className="text-body" title="bg-clip-text from-accent">
      No gradient washes, no bg-linear-to-r. {label}
    </p>
  );
}
