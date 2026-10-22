import { tv } from "tailwind-variants/lite";

// Motion from the tokens: settle on enter only, exits on the exit tokens, the
// progress edge as a token animation, and copy that mentions a transition.
export const sheet = tv({
  slots: {
    root: "transition-colors duration-fast ease-standard",
    panel:
      "transition-transform duration-slow ease-settle data-[state=closed]:duration-slow-exit data-[state=closed]:ease-exit",
    edge: "animate-progress-fill motion-reduce:animate-none",
    still: "transition-none",
  },
});

export function Row() {
  return (
    <div
      className="transition-colors duration-base ease-standard"
      aria-label="Status transition"
    >
      The transition is pending.
    </div>
  );
}
