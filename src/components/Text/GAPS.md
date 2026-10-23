# Text: gaps

Each entry is one place the brief, ADRs or tokens didn't decide something Text needed, the call made, and the alternative a human might prefer.

## Storybook paints no page background, so unpainted components fail contrast in dark

**Undecided:** the global decorator in `.storybook/preview.tsx` sets `data-theme` and `data-density` but paints nothing. Screen passed because it paints `bg-page` itself. Text paints no background, so in dark its light ink sat on the browser's white, and axe `color-contrast` failed all 8 dark renders on the first gate run. Every later component without its own surface (Stack, Heading, Amount, StatusTag's text) will hit the same failure.

**Call:** Text's stories carry their own decorator, a `<div className="bg-page">`, so each story sits on the page role it would sit on in a Screen. The component itself paints nothing.

**Alternative:** the global decorator paints `bg-page`, so every story gets the page by default and no component's stories repeat the wrapper.

## No measure for running copy

**Undecided:** the brief sets type sizes but no line length, and no token gives a content or prose width (`size.width` has only `sheet`). At 1280px the admin Body story runs about 115 characters to a line, well past `frontend-design`'s under-80. Screen's gaps already passed line length to Text, but Text has no token to set it with. `max-w-*` arbitrary values fail token lint.

**Call:** no max-width, so Text fills its container. On contractor screens, mostly seen on a phone, this rarely shows; on wide admin screens a long paragraph runs on.

**Alternative:** a `size.width.measure` token (about 65ch, or per density in px) that Text's `body` size applies, or a content width on Screen or Card instead.

## No error or success tone

**Undecided:** the spec gives Text a `tone`, but the brief names no error or success text role. A failure Text such as the `reminder-failed` result has no colour of its own. The status text roles (`text-overdue`, `text-failed`) are for status tags. `text-failed` is the light text that sits on the solid red fill, so it would be invisible on the page.

**Call:** two tones only, `default` (ink) and `muted` (ink-muted). A failure result is plain ink and says what happened and what to do next in words, which keeps to "Colour alone never communicates state".

**Alternative:** an `error` text role (and maybe `success`) in the colour tokens, AA-checked on page and surface, and a matching `tone`. Or a P1 Toast with a failure tone takes the job, as ADR 0011 already plans.

## Copy arrives as a `text` prop, not children

**Undecided:** ADR 0004 says every user-facing string is a literal prop, but doesn't name the prop a typography component takes its copy through. The UI spec's nodes reach a component's children only through slots, which hold nodes, not strings.

**Call:** a required `text: string` prop, rendered as the paragraph's only content. Text has no slots and takes no children, so nothing can nest inside a sentence.

**Alternative:** `children: z.string()` in the schema, which reads more naturally in TSX but means something else everywhere else in the registry. Heading will need the same call, and both should agree.

## A live Text may not be announced when it mounts with its copy

**Undecided:** the spec renders a live Text as `role="status"`, and it appears only in the state the action enters, so the region and its copy enter the DOM together. Screen readers announce changes inside an existing live region reliably. A region inserted with its content already in it is announced by some screen-reader and browser pairs and not by others.

**Call:** `role="status"` on the paragraph as the spec says, mounted with its copy. The gate's axe pass can't tell whether it was announced.

**Alternative:** the library keeps one persistent, empty status region (on Screen, or owned by `useScreenState`), and a live Text writes its copy into it when its state is entered. Worth deciding before Action wiring.

**Decided:** the alternative, in [#98](https://github.com/gianko/design-demo/issues/98). Screen always renders one visually hidden, empty, polite `role="status"` region and provides `announce(text)` through context (`src/components/Screen/announce.ts`). A live Text is an ordinary paragraph that calls `announce` with its copy when it mounts. Outside a Screen, as in Text's own stories, nothing is announced. P1's Toast reuses `announce` (ADR 0011).

## Money inside a sentence has nowhere to go

**Undecided:** the `tabular-numerals` render rule fails any money it sees without tabular figures, and Amount owns money. But a sentence like "Your $4,800.00 payment arrives Oct 24" can't be one Text, because Text takes a plain string and can't hold an Amount inline.

**Call:** Text sets no `tabular-nums`, and its `use` line sends money to Amount. A generated Text with an amount in it fails gate 7, and the repair splits it out.

**Alternative:** Text always sets tabular figures, so prose with money passes but every date and count in prose also gets tabular digits. Or Text takes inline Amount children, which would need a slot that holds runs of text and nodes.
