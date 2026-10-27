# Toast: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something Toast needed, the call made, and the alternative a human might prefer.

## The failure tone borrows the overdue status colours

**Undecided:** ADR 0011 gives Toast a success and a failure tone, but the brief names no error or success surface role. The only reds are the status pairs: `overdue` (a red tint with red ink) and `failed` (solid red with light ink). The triage of Text's gap #96 left it open: "an `error` text role can be added then if Toast needs one".

**Call:** a failure Toast is `bg-overdue text-overdue`, the gentlest red the tokens have, AA by construction in both themes. A success Toast is the bar's own `bg-surface-raised text-ink`, so the bar becoming the toast reads as one object, and no green sits beside the rows flipping to Scheduled (blue). The copy says what happened in words either way.

**Alternative:** an `error` surface and ink pair in the colour tokens, AA-checked, that a failure Toast uses, so status tags keep their colours to themselves. Or both tones neutral, with the failure told apart only by its copy.

## A toast stays for as long as its screen state

**Undecided:** the brief and ADR 0011 say when a toast enters, not when it leaves. Default toasts dismiss themselves after a few seconds or with a close button. A timer would be a state change the system starts, and generated screens hold no state of their own (ADR 0011), so neither fits the library as it stands.

**Call:** no timer, no close button. The toast shows while the screen is in the state that names it, and leaves when the screen leaves that state, such as a retry that's confirmed after a failure.

**Alternative:** the host returns to the default state some time after a success, through a View Transition the library owns (an untyped exit at `slow-exit`), or a quiet close IconButton once IconButton is public. Either needs an ADR 0011 amendment.

## A failure Toast and its bar stick at the same place on a long table

**Undecided:** ADR 0011 puts a failure Toast beside the bar, which stays. Both are sticky at `bottom-sm`, so the toast lands where the bar was and floats with it. On a short table they sit one above the other in the flow. Once the table runs past the window's edge, both stick 16px above it and the bar covers the toast. No token gives the bar's height as an offset, and a Toast can't hold the bar.

**Call:** the registry `use` line places a failure Toast right before the ActionBar, and both stay sticky. The stories' tables are short enough that nothing sticks, and `Failed` asserts the toast ends above the bar.

**Alternative:** a failure Toast that isn't sticky, or a sticky offset that clears the bar (a token for the bar's height plus a gap), or an ActionBar slot that holds the failure Toast so the two float as one.

## Focus drops when a confirmed bar leaves

**Undecided:** the brief keeps a pending Button focusable "so focus doesn't drop mid-operation". When the payment is confirmed, the success state leaves the bar out, so the focused Button is removed with it and focus falls to the document. The Toast isn't focusable, and nothing says where focus goes.

**Call:** the Toast stays unfocusable. Its result reaches a screen-reader user through Screen's status region, and the next Tab starts from the top of the page.

**Alternative:** the library moves focus on a `confirm` that removes the focused element, to the Toast (`tabIndex={-1}`) or to the DataTable the bar acted on.

## Toast's view transition rules live in a stylesheet the barrel imports

**Undecided:** no token class sets a view transition name (ActionBar gap #236), so Toast needs its own CSS file, as ActionBar has. But Toast's registry entry imports `Toast.tsx` for `variantEnum`, and the generator loads entries under tsx on node, which can't import a `.css` file. ActionBar's entry reads no `tv()` config, so its `.tsx` can import its stylesheet. Toast's entering duration (`slow`, the brief's "toast entering") also has no class, while every other View Transition timing lives in `src/styles.css`.

**Call:** `Toast.css` sets the success Toast's name to ActionBar's `action-result`, a failure Toast's to `action-failure`, and `slow` / `slow-exit` for those groups when motion is allowed (under `confirm` only, for `action-result`). The barrel (`src/index.ts`) imports it, not `Toast.tsx`, so Storybook and generated screens get it and the registry still loads. Style expectations in the stories assert both names. Rendering Toast without the barrel (a unit test) gives no names, which jsdom can't see anyway.

**Alternative:** #236's named utilities (`vt-action-result`, `vt-action-failure`) as classes in the `tv()` config, and the toast's timing beside the others in `src/styles.css`, so no component carries a stylesheet.
