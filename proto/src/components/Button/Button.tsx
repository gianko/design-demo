import type { MouseEventHandler, Ref } from "react";
import { tv } from "tailwind-variants/lite";
import type { ButtonRegistryProps } from "./Button.registry";

export const button = tv({
  slots: {
    root: "inline-flex min-h-target min-w-target cursor-pointer items-center justify-center rounded-control border px-sm py-2xs text-label whitespace-nowrap transition-colors duration-fast ease-standard select-none focus-visible:focus-ring disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-raised disabled:text-ink-muted aria-busy:cursor-progress",
  },
  variants: {
    intent: {
      primary: { root: "border-transparent bg-accent text-on-accent" },
      secondary: { root: "border-line bg-surface text-ink hover:bg-surface-raised" },
    },
  },
  defaultVariants: { intent: "primary" },
});

export type ButtonProps = ButtonRegistryProps & {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({ intent = "primary", label, disabled = false, pending = false, pendingLabel, onClick, ref }: ButtonProps) {
  const { root } = button({ intent });
  return (
    <button
      ref={ref}
      type="button"
      className={root()}
      disabled={disabled}
      aria-busy={pending || undefined}
      onClick={pending ? undefined : onClick}
    >
      {pending && pendingLabel ? pendingLabel : label}
    </button>
  );
}
