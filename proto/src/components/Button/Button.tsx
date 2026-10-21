import type { MouseEvent, Ref } from "react";
import { tv } from "tailwind-variants/lite";
import { CheckIcon, DownloadSimpleIcon, PaperPlaneTiltIcon, PlusIcon } from "@phosphor-icons/react";
import type { ButtonProps as RegistryProps } from "./Button.registry";

export const button = tv({
  slots: {
    root: "relative inline-flex min-h-target min-w-target items-center justify-center gap-2xs overflow-hidden rounded-control border px-sm py-3xs text-label transition-colors duration-fast ease-standard focus-visible:focus-ring",
    icon: "size-icon shrink-0",
    label: "",
    edge: "absolute inset-x-0 bottom-0 h-edge origin-left animate-progress-fill overflow-hidden",
    sweep: "block size-full animate-progress-sweep",
  },
  variants: {
    intent: {
      primary: { sweep: "bg-on-accent" },
      secondary: { sweep: "bg-accent" },
    },
    pending: {
      true: { root: "cursor-progress" },
      false: "",
    },
    disabled: {
      true: { root: "cursor-not-allowed border-transparent bg-disabled text-disabled" },
      false: "",
    },
  },
  compoundVariants: [
    { intent: "primary", disabled: false, class: { root: "border-transparent bg-accent text-on-accent" } },
    { intent: "secondary", disabled: false, class: { root: "border-control bg-surface text-ink" } },
    { intent: "primary", disabled: false, pending: false, class: { root: "hover:bg-accent-hover active:bg-accent-pressed" } },
    { intent: "secondary", disabled: false, pending: false, class: { root: "hover:bg-surface-hover active:bg-surface-pressed" } },
  ],
  defaultVariants: { intent: "primary", pending: false, disabled: false },
});

export const icons = {
  check: CheckIcon,
  download: DownloadSimpleIcon,
  send: PaperPlaneTiltIcon,
  plus: PlusIcon,
};

export type ButtonProps = RegistryProps & {
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({ label, intent = "primary", icon, pending = false, disabled = false, type = "button", onClick, ref }: ButtonProps) {
  const busy = pending && !disabled;
  const s = button({ intent, pending: busy, disabled });
  const Icon = icon ? icons[icon] : null;
  return (
    <button
      ref={ref}
      type={type}
      className={s.root()}
      disabled={disabled}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      onClick={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {Icon && <Icon className={s.icon()} aria-hidden />}
      <span className={s.label()}>{label}</span>
      {busy && (
        <span className={s.edge()} aria-hidden>
          <span className={s.sweep()} />
        </span>
      )}
    </button>
  );
}
