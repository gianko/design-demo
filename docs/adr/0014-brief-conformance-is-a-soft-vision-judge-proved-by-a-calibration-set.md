# Brief conformance is a soft vision judge, proved by a calibration set

Gate 5 asks whether a generated screen looks like the design brief, and structural heuristics would mostly repeat other gates: type on the scale is `type-on-scale`, motion tokens are `motion-tokens`, and spacing on the rhythm is token lint ([`lint/taste/RULES.md`](../../lint/taste/RULES.md), [ADR 0002](0002-token-only-tailwind-and-eslint-token-lint.md)). What no gate can see is what only a look can judge: hierarchy, density for the audience, the accent's restraint, elevation, copy, and repetition, which taste lint left to this gate (`heading-rhythm`, `repeated-container-text`, `marketing-buzzword`). So gate 5 is Opus 5.5 judging screenshots against a rubric taken from the design brief. It stays soft until a calibration set shows its verdicts can be trusted. Decided in the P2 grilling session on 2026-10-29.

## Decisions that come with it

- **Six binary criteria, each with a reason.** Hierarchy reads from size and weight; density fits the audience ([ADR 0001](0001-density-by-audience.md)); the accent only on the primary action, selection and focus; a shadow means it floats, never a box; copy is second person and specific, and errors say what happened and what to do next; nothing repeats itself. Each verdict comes with one sentence that quotes the brief, so a failure reads like a taste rule's finding. A verdict whose reason quotes nothing in the brief is undecided and isn't counted; the state's other verdicts stand, since each criterion is judged on its own. The score is criteria passed out of those decided. (Amended after #341, where dropping the whole state for one misquote left 18 of 45 P2 reps with gate 5 not run.)
- **No motion criterion.** A still can't show motion. Gate 7's `action-transitions` and the library's own stories already cover it.
- **The judge sees what a person sees, against what a person wrote.** For each screen state of a rep's final generated screen, it gets one screenshot at the brief's audience density, in the light theme, plus the design brief and the screen brief as text. It never sees the code or the UI spec. Dark is a token swap, and gate 4 checks its contrast.
- **It runs in eval runs and `pnpm generate`, never in `pnpm gate`.** CI has no secrets ([ADR 0009](0009-gates-render-in-one-pinned-linux-arm64-image.md)), and library stories aren't screens.
- **Soft means it changes nothing in a rep.** It sends no repair turn ([ADR 0010](0010-each-generator-step-repairs-itself-from-normalised-gate-failures.md)) and doesn't count toward a rep's pass. It gets its own column in the results file and the report: a pass rate per criterion per brief ([ADR 0008](0008-eval-runs-are-a-budgeted-script-compared-after-the-fact.md)).
- **A calibration set is the evidence.** Three to five copies of kept screens, each hand-broken against one criterion (two accents, a shadow on every card, a "Streamline your payroll" headline, contractor padding on an admin screen), are judged beside the kept screens as they are, three times each. The command reports how many verdicts were right and how many flipped between runs, and the case study quotes both numbers. Promoting gate 5 to hard is a later decision, made on those numbers.

## Considered options

- **Structural heuristics:** repeatable and free, but they mostly repeat gates 2 and 7, and they can't see hierarchy or restraint.
- **1–10 scores:** finer-grained, but far less repeatable than a yes or no with a reason, and a 6 tells a reader nothing.
- **Judging the code or the UI spec:** cheaper, but it grades what the model wrote, not what a person sees.
- **Hard from the start, or feeding the repair loop:** a judge that nobody has checked would be grading the generator, and repair turns would chase its noise.
