# ActionBar: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something ActionBar needed, the call made, and the alternative a human might prefer.

## No token class sets a view transition name

**Undecided:** ADR 0011 pairs ActionBar and Toast "by view transition name", and ADR 0006 says "the shared name is set by a class, so the `style` ban holds". No such class exists: Tailwind 4.3 has no `view-transition-name` utility, the token build defines none, and an arbitrary property (`[view-transition-name:action-result]`) fails token lint. A build session can't edit `src/styles.css` or the tokens (ADR 0006).

**Call:** `src/components/ActionBar/ActionBar.css`, imported by `ActionBar.tsx`, sets `view-transition-name: action-result` on `[data-component="ActionBar"]`. It's the only component with its own CSS file. A style expectation in every story asserts the computed name. Toast will need the same name, so its session must repeat the rule for its own marker or import this file. The registry entry doesn't import `ActionBar.tsx`, so `loadRegistry()` under tsx never meets the `.css` import.

**Alternative:** a named utility beside the others in the token build or `src/styles.css`, such as `@utility vt-action-result { view-transition-name: action-result; }`, that ActionBar and Toast both use as a class, so the shared name lives in one place and component folders stay CSS-free.

## The bar fades in but doesn't rise

**Undecided:** the brief lists "the bulk-action bar entering" as expected motion but doesn't say what the entrance is. A movement would need a keyframe, and keyframes live only in `tokens/keyframes.css`, which a build session doesn't edit (ADR 0005).

**Call:** none of its own. The bar enters with `rows-selected`'s View Transition: its own group is new-only, so it fades in at `base`, `standard`, as `src/styles.css` times every group, and fades out at `base-exit`, `exit`.

**Alternative:** a short rise (about 8px) on `::view-transition-new(action-result)` when it has no old view, from a hand-written keyframe and a rule in `src/styles.css`, with reduced motion keeping the crossfade.

## The bar shows no count of the selected rows

**Undecided:** bulk-action bars usually say how many rows the action will touch ("3 invoices selected"). The brief and ADR 0011 say only that the bar holds the action's Button. A UI spec's copy is literal (ADR 0004), so it can't hold a live count, and the library has no copy of its own to give one.

**Call:** no count. The body slot allows only Button, so a generated screen can't write a stale count in a Text. The ticked rows themselves show the selection.

**Alternative:** the bar renders the count from the host's selection, with library-owned copy such as "3 selected", or the Button's label takes a count placeholder the library fills ("Approve and pay 3"). Either puts copy in the library.

## Nested corners can't be concentric with the tokens

**Undecided:** the brief says "nested corners stay concentric (inner = outer − padding)". The bar is a surface (8px admin, 12px contractor), its Button has the control radius (6px) and sits 8px in, so concentric corners need an outer radius of 14px. No radius or spacing token pair gives that: 8 − 8 = 0 and 12 − 8 = 4, not 6.

**Call:** `rounded-surface` and `p-2xs`, the surface radius the radius table gives and one 8px step, so the bar is one control tall plus 16px (48px admin, 60px contractor, the contractor's row height). The corners aren't concentric.

**Alternative:** a `radius.raised` (or `radius.bar`) token equal to the control radius plus the bar's padding (14px), or padding of 2px admin and 6px contractor, which no spacing step offers.

## The registry use line says more than ADR 0011's

**Undecided:** ADR 0011 and the ticket give the use line as "the bulk-action bar; put the action's Button here, show it `when: [rows-selected]`, and leave it out of the success state so it becomes that state's Toast". ADR 0011 also says that on failure "the bar stays", which a UI spec gets only by naming the failure state in the bar's `when`, and the quoted line doesn't say so.

**Call:** the entry's `use` is ADR 0011's line followed by "Keep it in the failure state too, so the admin can retry with the rows still selected. Place it right after the DataTable it acts on." and when to reach for a Card footer or PageHeader's actions instead. `ActionBar.test.tsx` shows the bar, its Button and the selection all staying after a `fail` when `when` names the failure state.

**Alternative:** ADR 0011's line verbatim, leaving the failure state's bar to the screen briefs or to gate 1 (a rule that an action whose Button sits in an ActionBar shows that bar in its `to.failure` state).
