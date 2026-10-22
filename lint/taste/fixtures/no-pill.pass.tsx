import { tv } from "tailwind-variants/lite";

// Radius by role, and copy that merely mentions the class.
export const tag = tv({
  slots: {
    root: "inline-flex rounded-tag px-2xs text-caption",
    surface: "rounded-surface border border-line",
  },
});

export function Note() {
  return (
    <p className="rounded-control text-body" title="no rounded-fullness here">
      Nothing is rounded-full here.
    </p>
  );
}
