import { XIcon } from "@phosphor-icons/react/dist/csr/X";

// The library's one Phosphor icon map. A name says what the icon does in the
// product, not what it draws, so swapping a glyph is one line here. It holds
// only the icons some component renders; a component that needs another adds
// it here. Each icon comes from its own module, so whatever loads the registry
// (Vitest, the generator) never parses the whole set.
const glyphs = { close: XIcon };

export type IconName = keyof typeof glyphs;

export const iconNames = Object.keys(glyphs) as [IconName, ...IconName[]];

// One icon as the design brief draws it: Phosphor regular, in the
// surrounding text colour, sized by the `className` of whatever holds it.
// Decorative: whatever holds it carries the name.
export function Icon({
  name,
  className,
}: {
  name: IconName;
  className: string;
}) {
  const Glyph = glyphs[name];
  return <Glyph aria-hidden weight="regular" className={className} />;
}
