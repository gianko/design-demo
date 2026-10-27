import type { MouseEventHandler, Ref } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import type { iconButtonEntry } from "./IconButton.registry.ts";
import { Icon } from "./icons.tsx";

// The close button Sheet renders. A square at the density's control height,
// so it lines up with Buttons in a row and meets the 44px contractor target,
// holding one Phosphor glyph at the density's icon size. It is bare at rest,
// as a quiet Button is, so it never competes with what it closes; hover and
// pressed deepen a neutral fill. Disabled drains the glyph and stays bare.
// The glyph is decorative: the name is visually hidden text.
export const iconButton = tv({
  slots: {
    root: "inline-flex aspect-square h-control shrink-0 items-center justify-center rounded-control transition-colors duration-fast ease-standard focus-visible:focus-ring",
    // The density's icon size: 16px admin, 20px contractor.
    icon: "size-icon shrink-0",
    name: "sr-only",
  },
  variants: {
    disabled: {
      true: { root: "text-disabled" },
      false: {
        root: "text-ink hover:bg-surface-hover active:bg-surface-pressed",
      },
    },
  },
  defaultVariants: { disabled: false },
});

export type IconButtonProps = PropsOf<typeof iconButtonEntry> & {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  ref?: Ref<HTMLButtonElement>;
};

export function IconButton({
  icon,
  label,
  disabled = false,
  onClick,
  ref,
}: IconButtonProps) {
  const slots = iconButton({ disabled });
  return (
    <button
      ref={ref}
      type="button"
      data-component="IconButton"
      className={slots.root()}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} className={slots.icon()} />
      <span className={slots.name()}>{label}</span>
    </button>
  );
}
