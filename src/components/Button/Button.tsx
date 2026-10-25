import type { MouseEventHandler, Ref } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { buttonEntry } from "./Button.registry.ts";

// An action. Intent sets the fill; hover and pressed deepen it one step each,
// and only while the button can be pressed. Disabled is a flat neutral that
// replaces the intent's colours. Pending keeps the label and the rest colours
// and adds the progress edge along the bottom: `edge` fills once, then
// `sweep`, inside it, loops until pending ends. They are two elements because
// both animate `transform`.
export const button = tv({
  slots: {
    root: "inline-flex h-control items-center justify-center rounded-control px-control text-label whitespace-nowrap transition-colors duration-fast ease-standard focus-visible:focus-ring",
    edge: "absolute inset-x-0 bottom-0 h-edge origin-left animate-progress-fill motion-reduce:animate-none",
    sweep: "block size-full animate-progress-sweep motion-reduce:animate-none",
  },
  variants: {
    intent: {
      primary: { sweep: "bg-progress" },
      // Bordered whether or not it's disabled, so enabling it doesn't
      // change its width.
      secondary: { root: "border", sweep: "bg-accent" },
      quiet: { sweep: "bg-accent" },
    },
    disabled: { true: { root: "bg-disabled text-disabled" }, false: {} },
    pending: { true: { root: "relative overflow-hidden" }, false: {} },
  },
  compoundVariants: [
    {
      intent: "primary",
      disabled: false,
      class: { root: "bg-accent text-on-accent" },
    },
    {
      intent: "secondary",
      disabled: false,
      class: { root: "border-control bg-surface text-ink" },
    },
    {
      intent: "secondary",
      disabled: true,
      class: { root: "border-transparent" },
    },
    { intent: "quiet", disabled: false, class: { root: "text-ink" } },
    {
      intent: "primary",
      disabled: false,
      pending: false,
      class: { root: "hover:bg-accent-hover active:bg-accent-pressed" },
    },
    {
      intent: ["secondary", "quiet"],
      disabled: false,
      pending: false,
      class: { root: "hover:bg-surface-hover active:bg-surface-pressed" },
    },
  ],
  defaultVariants: { disabled: false, pending: false },
});

export type ButtonProps = PropsOf<typeof buttonEntry> & {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  text,
  intent,
  disabled = false,
  pending: running = false,
  onClick,
  ref,
}: ButtonProps) {
  // A disabled button can't be running anything it shows.
  const pending = running && !disabled;
  const { root, edge, sweep } = button({ intent, disabled, pending });
  return (
    <button
      ref={ref}
      type="button"
      data-component="Button"
      className={root()}
      disabled={disabled}
      // Busy and unavailable, but still focusable, so focus doesn't drop
      // while the operation runs.
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      onClick={pending ? undefined : onClick}
    >
      {text}
      {pending && (
        <span aria-hidden className={edge()}>
          <span className={sweep()} />
        </span>
      )}
    </button>
  );
}
