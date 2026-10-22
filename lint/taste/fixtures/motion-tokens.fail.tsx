import { tv } from "tailwind-variants/lite";

// Motion off the tokens, planted where a className check would miss it: in
// tv() slots and variants, behind variant prefixes, in a template literal.
export const sheet = tv({
  slots: {
    root: "motion-safe:transition-colors duration-fast", // ✗ taste/motion-tokens
    panel: "hover:transition-all duration-fast ease-standard", // ✗ taste/motion-tokens
    edge: "transition-opacity duration-150 ease-standard", // ✗ taste/motion-tokens
  },
  variants: {
    open: {
      false: { panel: "data-[state=closed]:ease-settle" }, // ✗ taste/motion-tokens
    },
  },
  compoundVariants: [
    { open: false, class: { root: "duration-base-exit ease-settle" } }, // ✗ taste/motion-tokens
  ],
});

export function Row({ selected }: { selected: boolean }) {
  return (
    <div
      className={`transition-transform ease-standard ${selected ? "bg-selected" : ""}`} // ✗ taste/motion-tokens
    />
  );
}
