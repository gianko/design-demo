# Notice: gaps

Each entry is one place where the brief, the ADRs or the tokens didn't decide something Notice or Card's `result` slot needed. It gives the call made and the alternative a human might prefer.

## The Card carries its transition name around the Notice, not only while it holds one

**Undecided:** ADR 0016 says the Card holding a Notice carries a library-owned view transition name, and its group animates the Card's height. A group animates only when the name is in both views, and the Card in the state before the action (default) holds no Notice yet, nor does the Card in a state that drops it.

**Call:** the Card is named `card-result` while it holds a Notice; while its footer's Button is pending (`has-aria-busy:vt-card-result`), which is the old view of the change that brings the Notice, since `useAction` clears pending inside the update; and for the state entry in which it lost its Notice, with the `closing` view-transition class, so that change runs the exit timing. A Card whose action ends with the Card gone is named in the old view only, and fades with the page.

**Alternative:** name every Card with a `result` slot given at all (`result={undefined}` in the default state), which a UI spec can't express; or let the library name the action's Card from `useAction`, which doesn't know which Card holds the Button.

## Two Cards named at once skip the transition

**Undecided:** the name is one fixed name, `card-result`, as Toast's and Sheet's are, so each must be unique in a snapshot. Gate 1 keeps one Notice per state, but a Card holding a Notice and another Card whose Button is pending (two Cards with an action each), or two pending Buttons, would both carry it.

**Call:** accept it. The browser skips that transition and the update still runs, so the screen lands in the right state without the motion.

**Alternative:** `view-transition-name: match-element` with a `card-result` view-transition class, unique per element. It breaks the convention that a `vt-*` class names the name it sets, which Screen's focus rule reads (src/components/Screen/focus.ts, src/styles.test.ts).

## The growing edge is cut flat during the motion

**Undecided:** the group clips its images to a rectangle. While the Card grows or shrinks, its moving bottom edge is a straight cut through the strip, without the Card's hairline or rounded corners, for `base` (240ms). The pseudo-elements hang off the root, outside the Screen's density scope, so they can't read the density's surface radius (as Toast's slide distance can't read the page padding).

**Call:** a square clip; the corners and hairline return when the transition ends.

**Alternative:** a radius on the group from a root-level variable per density, or a clip at the larger of the two radii (12px), which would round an admin Card's moving edge more than its corners.

## The settle overshoot doesn't show on the Card's height

**Undecided:** under `confirm` the group's height runs `ease-settle`, as the brief asks of a confirmed result. The images are pinned at their natural size, so for the overshoot the group is taller than the new image and the extra height shows only the page behind it.

**Call:** keep `ease-settle` per ADR 0016; the confirmation reads as the strip arriving with the settle's deceleration.

**Alternative:** run the height at `standard` under both types and keep the settle for what moves visibly (a Toast, the statuses).

## Notice's glyphs are outside the shared icon map

**Undecided:** IconButton/icons.tsx says it is the library's one Phosphor icon map and that a component that needs another icon adds it there. Its names are also IconButton's `icon` options in the registry and the variants of IconButton's Figma set, so adding `success` and `failure` there would offer them to IconButton.

**Call:** Notice imports `CheckCircle` and `WarningCircle` itself, regular weight, sized by `size-icon` and in the copy's colour, as the map would draw them.

**Alternative:** split the map into the icons any component draws and the ones IconButton offers.
