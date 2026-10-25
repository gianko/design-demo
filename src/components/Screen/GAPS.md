# Screen: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something Screen needed, the call made, and the alternative a human might prefer.

## 1. The page background stops where the content stops

**Undecided:** nothing says whether Screen fills the viewport. Screen paints `bg-page`, but on a short screen the area below it shows whatever `body` paints, which is the browser default and not a plum-tinted neutral. No token gives a viewport-height minimum, and `min-h-screen` would be a Tailwind static utility outside the closed vocabulary's intent.

**Call:** Screen sizes to its content. In Storybook and the gate this doesn't show, because shots crop to the story root.

**Alternative:** add a `size.min-height.screen` token (`100dvh`) and give Screen `min-h-screen`, or have whatever hosts generated screens paint `body` with `bg-page`.

**Decided (#85):** Screen owns it, not each host. Its root takes `min-h-dvh`, Tailwind's keyword utility for a dynamic-viewport minimum, with no token: the token build accepts `px` dimensions only, and Figma variables can't hold a viewport unit.

## 2. No maximum content width

**Undecided:** the brief sets page padding per density but no content width. On a wide admin desktop a paragraph directly inside Screen runs past 100 characters (see the Admin story at 1280px), against `frontend-design`'s under-80-character line length. The contractor is often on a phone, where this doesn't arise.

**Call:** no max-width, so Screen stays a plain padded block. Line length is left to Text (prose `max-width`, as RULES.md's `line-length` row already suggests for notes fields) and to layout components.

**Alternative:** a per-density `size.width.content` token that Screen applies, either centred or left-aligned. The brief would need to say which.

## 3. Screen doesn't space its children

**Undecided:** the spec gives Screen `p-page` only. Nothing says whether several top-level children get a gap.

**Call:** none. Layout spacing is Stack's (ADR 0002), and the registry `use` line tells the spec step to wrap more than one child in a Stack. Without that Stack, children touch.

**Alternative:** give Screen a default vertical gap (e.g. `gap-lg`) so a screen without a Stack still reads. That would mean two ways to space the top level.

## 4. `main` landmark

**Undecided:** the brief and ADRs don't name Screen's element or role.

**Call:** `<main>`. One Screen per UI spec matches one `main` per page, and screen readers can jump to it.

**Alternative:** a plain `<div>`, if generated screens will ever be mounted inside an app shell that has its own `main`. Two `main` landmarks would fail axe's `landmark-no-duplicate-main`.

## 5. The screen-state data attribute isn't here yet

**Undecided:** ADR 0011 says "Screen exposes its current state as a data attribute", but `useScreenState` arrives with spec § Action wiring, after this component. Nothing says how the state reaches Screen: a prop the generated screen passes, or a context the hook provides.

**Call:** left out. Screen's props are only `audience`, so the registry offers nothing the generator can't use yet.

**Alternative:** add an optional `state` prop now. That would put a prop the UI spec has no use for in the registry, and change its hash twice.

## 6. Stories pin density through `audience`, not the toolbar

**Undecided:** every story renders in admin and contractor through the Storybook `density` global, but Screen sets its own `data-density`, and the inner scope wins. So the Admin story looks the same under both density globals, and so does Contractor: of each story's four shots, two pairs are identical.

**Call:** one story per `audience` value, as the skill asks for one story per variant. The duplicate shots show that Screen's audience overrides the density around it.

**Alternative:** one story whose `audience` follows the density global, which avoids the duplicates but then never shows the override.
