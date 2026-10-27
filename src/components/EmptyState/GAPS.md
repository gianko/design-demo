# EmptyState: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something EmptyState needed, the call made, and the alternative a human might prefer.

## An empty state stands in place of the DataTable, not inside it

**Undecided:** the P1 spec says "each table with an empty state shows an EmptyState in it", but DataTable has no slot for one, and a build session can't change DataTable. Nothing says whether the empty state replaces the table or sits inside its frame under the column headers.

**Call:** EmptyState is a sibling of the DataTable. The registry `use` line puts it where the DataTable goes, shown `when: [empty]`, with the DataTable left out of that state. It draws the table's own flat frame (`rounded-surface border border-line bg-surface`), so the empty list keeps the table's outline. Because it paints a surface, it can't sit inside a Card: the use line says so and the `nested-cards` render rule catches it, but gate 1's nesting check only knows Card, so a UI spec that puts one in a Card passes gate 1 and fails only at render.

**Alternative:** a DataTable `empty` slot, allow-listed to EmptyState, that renders it inside the table's frame under the headers when `rows` is empty, so the spec step doesn't need a `when` for it. Or gate 1 treats EmptyState as a surface in its nesting check.

## The reason is a paragraph, not a Heading

**Undecided:** P0's empty states used a level 2 Heading for "No invoices yet" and a Text under it. Nothing says whether an empty list's reason belongs in the screen's heading outline.

**Call:** the reason is a `<p>` at body size and 600, the weight of the column headers it stands in for, so it adds nothing to the outline and can't skip a level wherever a screen places it. It still reads first, right after the PageHeader.

**Alternative:** a `title` slot allow-listed to Heading, as PageHeader's, so a screen-reader user can jump to it by heading and gate 1 checks its level.

## An empty state has no icon and no action

**Undecided:** default empty states carry an icon and a button ("Create your first invoice"). The brief names Phosphor for icons, but the icon map arrives with IconButton, and no P1 brief asks an empty list to start anything.

**Call:** title and text only. The copy says why the list is empty and what will appear, which is what the P1 briefs ask for, and the icon-above-a-title tile is the template tell RULES.md names EmptyState as the likeliest place for.

**Alternative:** an `actions` slot allow-listed to Button, once a brief has an empty list the user can fill themselves; a small Phosphor icon beside the title, once the icon map exists.
