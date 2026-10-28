# Toast: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something Toast needed, the call made, and the alternative a human might prefer.

## The failure tone borrows the overdue status colours

**Undecided:** ADR 0011 gives Toast a success and a failure tone, but the brief names no error or success surface role. The only reds are the status pairs: `overdue` (a red tint with red ink) and `failed` (solid red with light ink). The triage of Text's gap #96 left it open: "an `error` text role can be added then if Toast needs one".

**Call:** a failure Toast is `bg-overdue text-overdue`, the gentlest red the tokens have, AA by construction in both themes. A success Toast is the bar's own `bg-surface-raised text-ink`, so the bar becoming the toast reads as one object, and no green sits beside the rows flipping to Scheduled (blue). The copy says what happened in words either way.

**Alternative:** an `error` surface and ink pair in the colour tokens, AA-checked, that a failure Toast uses, so status tags keep their colours to themselves. Or both tones neutral, with the failure told apart only by its copy.

## A toast stays for as long as its screen state

**Retired (ADR 0013, #299):** a success Toast dismisses itself after the `toast` duration token, both tones have a close button, and whether a Toast shows is the library's own state, not a screen state.

**Undecided:** the brief and ADR 0011 say when a toast enters, not when it leaves. Default toasts dismiss themselves after a few seconds or with a close button. A timer would be a state change the system starts, and generated screens hold no state of their own (ADR 0011), so neither fits the library as it stands.

**Call:** no timer, no close button. The toast shows while the screen is in the state that names it, and leaves when the screen leaves that state, such as a retry that's confirmed after a failure.

**Alternative:** the host returns to the default state some time after a success, through a View Transition the library owns (an untyped exit at `slow-exit`), or a quiet close IconButton once IconButton is public. Either needs an ADR 0011 amendment.

## A failure Toast and its bar stick at the same place on a long table

**Retired (ADR 0013):** the bar is gone; a failure Toast sits on its own, last in the Screen.

**Undecided:** ADR 0011 puts a failure Toast beside the bar, which stays. Both are sticky at `bottom-sm`, so the toast lands where the bar was and floats with it. On a short table they sit one above the other in the flow. Once the table runs past the window's edge, both stick 16px above it and the bar covers the toast. No token gives the bar's height as an offset, and a Toast can't hold the bar.

**Call:** the registry `use` line places a failure Toast right before the bar, and both stay sticky. The stories' tables are short enough that nothing sticks, and `Failed` asserts the toast ends above the bar.

**Alternative:** a failure Toast that isn't sticky, or a sticky offset that clears the bar (a token for the bar's height plus a gap), or a slot in the bar that holds the failure Toast so the two float as one.

## Focus drops when a confirmed bar leaves

**Retired (ADR 0013):** the bar is gone; when a confirmed result disables the footer Button that had focus, focus moves to the table.

**Undecided:** the brief keeps a pending Button focusable "so focus doesn't drop mid-operation". When the payment is confirmed, the success state leaves the bar out, so the focused Button is removed with it and focus falls to the document. The Toast isn't focusable, and nothing says where focus goes.

**Call:** the Toast stays unfocusable. Its result reaches a screen-reader user through Screen's status region, and the next Tab starts from the top of the page.

**Alternative:** the library moves focus on a `confirm` that removes the focused element, to the Toast (`tabIndex={-1}`) or to the DataTable the bar acted on.

## Toast's view transition rules live in a stylesheet of its own

**Retired:** the alternative was taken: the names became utilities in `src/styles.css`, and since ADR 0013 there is one, `vt-toast`, with the toast's slide beside the sheet's.

**Undecided:** no token class sets a view transition name (the bar's gap #236), so Toast needs its own CSS file, as the bar has. But Toast's registry entry imports `Toast.tsx` for `variantEnum`, and the generator loads entries under tsx on node, which can't import a `.css` file. The bar's entry reads no `tv()` config, so its `.tsx` can import its stylesheet. Toast's entering duration (`slow`, the brief's "toast entering") also has no class, while every other View Transition timing lives in `src/styles.css`.

**Call:** `Toast.css` sets the success Toast's name to the bar's `action-result`, a failure Toast's to `action-failure`, and `slow` / `slow-exit` for those groups when motion is allowed (under `confirm` only, for `action-result`). `Toast.tsx` imports it, as the bar's does, and the `tv()` config moved to `toast.ts`, which the registry entry imports instead of `Toast.tsx`, so the registry still loads under node (#245). Style expectations in the stories assert both names.

**Alternative:** #236's named utilities (`vt-action-result`, `vt-action-failure`) as classes in the `tv()` config, and the toast's timing beside the others in `src/styles.css`, so no component carries a stylesheet.

## A toast in its host's starting state holds its timer

**Undecided:** ADR 0013 says gate renders and Figma captures show the Toast "with its timer paused, so they are deterministic", but not how a render pauses it. The open-sheet and ticked-rows renders set their state through library test attributes the Storybook preview writes.

**Call:** no attribute. A Toast in the state its host starts in, the screen-state entry 0, is a still render of that state, and its timer holds until the state is next entered. Every state story, gate render and capture starts its host in the state it shows, so each is the same every run, and a toast that enters through an action, in a story or an app, times out as it should.

**Alternative:** a `data-test-hold-toast` attribute, like `data-test-open-detail`, that the preview sets on every story and the gate and the capture walk rely on, so a starting-state toast would time out in an app that deep-links into a result state.

## The slide clears the widest page padding, not the toast's own

**Undecided:** the toast sits the page padding in from the window's edge, so sliding by its own width, as the sheet does, would leave a strip of it showing at the start of the slide-in and the end of the slide-out. The view transition's pseudo-elements hang off the root, where `--ds-density-padding-page` is admin's 28px whatever the screen's density, so they can't read the toast's real inset.

**Call:** the shared `slide-in` and `slide-out` keyframes translate by the image's width plus `--slide-past`, which a toast's pseudo-elements set to `--ds-space-2xl`, 40px: wider than either density's page padding (28px, 36px), which `src/styles.test.ts` checks against the token sources. A contractor toast travels 4px past the edge it needs to; an admin one 12px.

**Alternative:** a size token for the toast's slide, or a density attribute on the document root so the root resolves the screen's own page padding.

## A toast that replaces another changes in place

**Undecided:** ADR 0013 gives the toast a slide in and a slide out, no fade and no scale, and one toast at a time, but not what a result that replaces a showing toast looks like: a confirmed retry after a failure, or a retry that fails again.

**Call:** the toast has one view transition name for both tones, so a toast in both views is one group: it morphs in place from the old one to the new, with the group's own crossfade, and slides nowhere. The slides apply only to an image alone in its pair (`:only-child`). A retry that fails again is the same toast in both views, so nothing visibly changes; it is announced again.

**Alternative:** the old toast slides out while the new one slides in, both at the corner, or the new one slides in only once the old has left.

## The timer reads its token from CSS

**Undecided:** ADR 0005 says `tokens.ts` holds names only and no code reads a token value, but the timer needs the `toast` duration as a number.

**Call:** the Toast reads `--ds-motion-duration-toast` off its own element's computed style when its timer first runs, so the value still comes from the token build through `tokens.css`, as CSS reads the others. Where no stylesheet sets it, nothing times out. The unit tests load `tokens.css` and hold the timer to the value in `tokens/motion.json`.

**Alternative:** the token build emits duration values in `tokens.ts` beside the names, an ADR 0005 amendment.
