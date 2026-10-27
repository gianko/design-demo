# IconButton: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something IconButton needed, the call made, and the alternative a human might prefer.

## The icon's colour role is unstated

**Undecided:** the brief sets the icon set, weight and size ("Phosphor, regular weight: 16px on admin screens, 20px on contractor screens") but not a colour role for an icon. The colour roles name text (`ink`, `ink-muted`) and the accent, and nothing for a glyph that is the whole of a control.

**Call:** the glyph is `text-ink`, the quiet Button's label colour, since the glyph is the control's label. Disabled is `text-disabled`, as a disabled Button's label is.

**Alternative:** `text-ink-muted` at rest, deepening to `text-ink` on hover, so a sheet's close button sits further back than the sheet's own content; or an `icon` colour role in the tokens that every icon uses.

## Hover doesn't show on a raised surface in dark

**Undecided:** IconButton's hover is `surface-hover`, as a quiet Button's is. In dark, `surface-hover` and `surface-raised` are the same value (`oklch(0.27 0.025 330)`). The brief says "In dark mode, levels are lighter surfaces", so the Sheet that renders this close button will likely sit on `surface-raised` or lighter, where the hover fill can't be seen. Only pressed (`surface-pressed`, 0.31) would show. IconButton's own stories render on the page, where hover shows in both themes.

**Call:** keep `surface-hover`, the one neutral hover role, so IconButton matches a quiet Button. Sheet's build sees the problem first, in its own hover shot.

**Alternative:** a dark `surface-hover` a step above `surface-raised` (which would also lift every quiet and secondary Button's hover), or a separate hover role for controls on raised and overlay surfaces.
