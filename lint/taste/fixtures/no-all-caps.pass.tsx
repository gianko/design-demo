import { tv } from "tailwind-variants/lite";

// Sentence case from the source, other text transforms, and copy that merely
// mentions the class. Capitals in copy are the render rule's to judge.
export const column = tv({
  slots: {
    root: "text-caption text-muted normal-case",
    header: "text-label lowercase",
  },
});

export function Note() {
  return (
    <p className="text-body capitalize" title="never uppercase">
      Pay by IBAN, never in uppercase.
    </p>
  );
}
