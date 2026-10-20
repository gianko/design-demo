# Claude Code's design skills: what they do to component output

Research for #7. Feeds #13 (prototype one component against the design brief).

Question: what does Anthropic's `frontend-design` skill instruct and ban, and do Claude Code's `/design` skill and the artifact design skills help when building components against our own human-written brief, or pull toward generic defaults?

Researched 2026-10-21 against Claude Code v2.1.305. Sources are listed at the end; `[n]` marks which one backs a claim.

## TL;DR

- **`frontend-design` was rewritten on 2026-09-03** [1][2]. The current text **no longer names any banned font**. The old "never Inter, Roboto, Arial, system fonts, Space Grotesk, purple gradients on white" list is gone [3]. It now bans a set of typographic and structural *tells* and five named "default clusters". If `docs/design-brief.md` wants Inter/Geist banned, the brief has to say so itself.
- **The skill defers to our brief**, in its own words: "the brief's own words always win" [1]. So it doesn't fight a written brief on any axis the brief pins down. Where the brief leaves something open, it pushes *away* from the defaults it lists.
- **It is written for pages, not component libraries.** It has a hero, "spend your boldness in one place", "take aesthetic risk", and a planning step that invents a fresh 4–6-hex palette and typefaces. Run per component, that planning step causes token drift and a different "signature" on every component. Our component-build skill has to override these steps explicitly (table below).
- **`/design` doesn't belong in the component loop.** It draws artboards on a claude.ai canvas, not TSX in the repo, so no gate can run on what it makes. It needs artifacts, which are off in `claude -p` and the Agent SDK [6]. Its design-system path (`/design-sync`) uploads to standalone Claude Design, which closes by 2026-12-14 [7].
- **`artifact-design`** (bundled) only applies when Claude publishes an artifact page. It is irrelevant to component code, but its precedence rule ("user's words, then project's existing system, then its choices") and its ban list, which *does* name Inter and Space Grotesk, are worth borrowing [5][9].

## 1. `frontend-design`: what it says now

### Provenance

| Copy | Status |
| --- | --- |
| `anthropics/skills` `skills/frontend-design/SKILL.md` @ `41bbe19` (PR #1713, merged 2026-09-03) [1][2] | Canonical |
| `anthropics/claude-plugins-official` `plugins/frontend-design/...` [4] | Byte-identical to canonical |
| `anthropics/claude-code` `plugins/frontend-design/...` | Same frontmatter and header (checked the head) |
| Local install `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md` | Byte-identical to canonical (`diff` clean) |

License: Apache 2.0, so restating it in our brief with credit is fine.

History: Dec 2025 (`0075614`) was the original "BOLD aesthetic direction / NEVER use Inter, Roboto, Arial" version [3]. June 2026 (`2235be7`) introduced the design-lead framing and three default looks. Sept 2026 (`41bbe19`) added the explicit typographic tells, the SaaS-card kit and the template-chrome cluster, and made motion more restrained [1].

### Instructions that act on component output

Quoted verbatim from [1] unless marked as paraphrase.

- **Framing.** "Approach this as the design lead at a design studio known for giving every client a distinct visual identity... make deliberate, opinionated choices about palette, typography, and layout that are specific to this brief, and take aesthetic risk if justified."
- **Grounding.** "If the brief does not identify what the product or subject matter is, identify it yourself before designing, and confirm with the client." The subject's "industry, subject matter, materials, and vernacular are where distinctive visual choices come from". Its own example sets "a dashboard for financial analysts" against a children's toy.
- **Typography.** "use one family or two, and if two, make them clearly distinct." "Choose your typefaces deliberately, not the default families you would reach for on any other project, and set a clear type scale following the default guidance of The Elements of Typographic Style with intentional weights, widths, and spacing." "Default to line lengths of less than 80 characters. Serif typefaces can have slightly longer line lengths; give serif body text slightly more line-height than a sans-serif."
- **Structure.** "Visual structure is information. Structural devices like outlines, borders, numbering, eyebrows, dividers, labels, etc., encode useful information about the content rather than decorate it."
- **Motion.** "Use non-user-triggered motion sparingly and deliberately, only to draw attention... Motion that answers a person's action (opening, expanding, confirming) is welcome when it shows what changed."
- **Precedence.** "Where the brief pins down a visual direction, follow it exactly — the brief's own words always win, including when it asks for one of these looks. Where it leaves an axis free, don't spend that freedom on one of these defaults."
- **Process.** Two passes. (1) "brainstorm a short design plan... create a compact token system with color, type, layout, and principles": color as "4–6 named hex values", typefaces and roles, layout as prose plus ASCII wireframes with alignment guidance, and principles. (2) "review that plan against the brief before building: if any part of it reads like the generic default you would produce for any similar page (work through a similar prompt to see if you arrive somewhere similar)... revise that part, say what you changed and why." Then code.
- **CSS.** "be careful of structuring your CSS selector specificities. It's easy to generate CSS classes that cancel each other out".
- **Restraint.** "Spend your boldness in one place. Let one element be the memorable thing, keep everything around it quiet and disciplined, and cut any decoration that does not serve the brief."
- **Quality floor.** "Build to a quality floor without announcing it: responsive down to mobile, visible keyboard focus, reduced motion respected, visually accessible, harmonious color palettes."
- **Self-critique.** "Critique your own work as you build, taking screenshots to review if your environment supports it". Also "remove one accessory" (Chanel), and keep notes on what you've tried for later passes.
- **Copy.** Write from the user's side of the screen ("A user manages notifications, not webhook config"). Use active voice. A CTA "says exactly what happens": "Save changes," not "Submit". The same verb carries through the flow ("Publish" produces the toast "Published"). "Errors don't apologize, and they are never vague about what happened. An empty screen is an invitation to act." Use "plain verbs, sentence case, no filler".

### The exact ban list (restate in `docs/design-brief.md`)

From [1]. The first group is phrased as "avoid", the last as "defaults rather than choices" that hold unless the brief asks for them.

**Typographic tells** ("the commonest tells of a generated page"):
1. Accenting just a single word or phrase in a headline, like putting one word in italic/bold or a different color.
2. Using all caps for labels.
3. Adding unnecessary typographic labels above content.

**Structure:**
4. Numbered markers (01 / 02 / 03) unless the content really is a sequence (a stepped process, a timeline).

**Hero / layout:**
5. "A big number with a small label, supporting stats, and a gradient accent" as the default opener. Use it only if that's truly the best option.

**Motion:**
6. "Fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as AI-generated." Non-user-triggered motion is for drawing attention only, ideally one orchestrated moment.

**Typefaces:**
7. "The default families you would reach for on any other project". No family is named.

**The five default clusters:**
8. Warm cream background (near `#F4F1EA`) with a high-contrast serif display and a terracotta or warm-clay accent (often near `#D97757`, "Anthropic's own Claude-interaction accent, so on a user's brief it reads as a tell").
9. Near-black background with a single bright acid-green or vermilion accent.
10. Broadsheet layout: hairline rules, zero border-radius, dense newspaper-like columns.
11. **SaaS-card kit**: content chopped into identical rounded cards, one border-radius on everything regardless of hierarchy, the same soft grey shadow (`rgba(0,0,0,.1)`) under each, and gradient washes as decoration.
12. **Template chrome**:
    - a tracked-out ALL-CAPS eyebrow label above every heading
    - meta strings joined with middle dots (`A · B · C`)
    - labels built as `WORD — fragment` with a spaced em dash
    - tinted near-black (`#0B0B0B`, `#111`) standing in for black
    - a monospace face for small data labels
    - a `→` appended to link and button text

Our demo brief's bans (no Inter/Geist, no Tailwind palette names, no shadcn silhouettes, no 8px-grid indigo button) are **not** in this list. Item 11 is the closest overlap with "shadcn silhouette". Our brief has to carry its own bans.

### Help, conflict, or default-pull: our component sessions

| Instruction | Effect on a component built against our brief | Verdict |
| --- | --- | --- |
| "the brief's own words always win" | The brief is authoritative on every axis it pins down | Helps |
| Plan pass invents a 4–6 hex palette and typefaces | Tokens already exist (`tokens/*.json`). A fresh plan per component means token drift and raw hex in code | **Conflicts**. Override it |
| Hero, "one memorable thing", "take aesthetic risk" | A Button has no hero. A "signature" per component makes the library inconsistent | **Conflicts**. The signature is decided once in the brief (motion), not per component |
| "identify [the subject] yourself... and confirm with the client" | Our brief names the subject (contractor payroll), so this is a no-op. In a headless loop, "confirm" could stall | Neutral. Say "don't ask; log an ADR for gaps" |
| Review-the-plan-against-defaults pass | Exactly the self-check we want before code is written | Helps. Keep it, retargeted at components |
| Ban list (above) | Steers away from generic defaults | Helps, but it is *incomplete* for us (no font names) |
| Motion: user-triggered motion welcome, ambient motion sparse | Compatible with "motion first-class": component motion is mostly user-triggered (open, expand, confirm, toast) | Helps. The brief should say where motion is mandatory |
| Ban "monospace for small data labels", "ALL-CAPS labels" | Payroll tables tempt both (amounts, IDs, column headers) | Tension. The brief must decide explicitly; the skill yields if it does |
| Ban "tinted near-black standing in for black" | **Opposite** of impeccable's "no pure black" rule that the demo brief lists as a taste-lint candidate | **Conflict between our two references.** The brief has to pick one |
| Quality floor (focus, reduced motion, accessible) | Matches gate 4 (a11y) | Helps |
| Screenshot self-critique | Matches Storybook + Playwright gates | Helps |
| CSS specificity warning | Relevant if CSS modules win #9 | Helps |
| Copy rules | Directly useful for Button labels, Toast, EmptyState, error states | Helps |

Net: the skill pulls *away* from generic AI defaults. Its pull is toward "distinctive editorial page", though, and a dense payroll product UI wants something different. The bundled `artifact-design` skill has a better-fitting section for this ("When the page is a UI (dashboard, tool)": summary before detail, state shown in form as well as numbers, semantic colour kept apart from the accent, interactive elements look interactive) [9]. Our brief can restate those principles, because that skill never loads for component code.

## 2. `/design` (bundled, research preview)

What it is [5][6][8]:

- "Draft UI mockups, screen flows, landing pages, or posters as artboards on one canvas, published as a Claude Design artifact". You edit artboards in a desktop browser and export each one as PNG or PDF.
- Requires artifacts: Pro/Max/Team/Enterprise, a claude.ai login, the Anthropic API, and a Design template enabled for the org. The commands reference says v2.1.265+; the week-34 note says v2.1.234+ [6][8].
- Artifacts are **off by default in the Agent SDK, the GitHub Action, and `claude -p`** [5].
- Companion commands: `/design-sync` "Convert[s] your repo's React design system and upload[s] it to Claude Design, so designs it produces use your real components". `/design-login` and `/design consent` handle auth [6]. Changelog 2.1.302: "standalone Claude Design (claude.ai/design) closes by December 14, 2026" [7].
- When the Artifact tool starts a design, it lists the account's design systems and attaches the **default design system's README** (Artifact tool definition, observed in this session [9]).

Assessment for component building:

- **Wrong output.** It makes artboards on claude.ai, not `.tsx` in the repo. None of gates 2/4/6/7 can run on it, and it isn't the "hand-built React library" the demo brief decides on.
- **Default pull.** Unless we `/design-sync` our library first, it draws with its own choices or the account's default design system. Either way that's someone else's taste competing with our brief. Its internal instructions are bundled and not published, so we can't verify how it ranks a brief against them.
- **Can't run in the pipeline.** With artifacts off in `-p` and the SDK, the eval runner and agent runtime (#10) can't call it.
- **Fragile.** `/design-sync` targets a product that closes in under two months.
- **Narrative risk.** A canvas of AI-drafted visual options *before* the brief would weaken the "human-written brief is the taste" story.

Verdict: **don't load or invoke `/design` in component sessions.** Its only fair use is after the library exists, as an optional side experiment for the case study ("we tried Claude Design; here's why code is the source of truth"). It isn't needed for P0.

## 3. Other bundled design skills

- **`artifact-design`** loads automatically whenever Claude publishes an artifact page; it doesn't touch repo code [5][9]. Two parts are useful to us:
  - Precedence: "Look for an existing design system first: CLAUDE.md, a tokens or theme file, existing component styles. When one exists, apply it... Precedence is always the user's own words, then the project's existing system, then your choices." The public docs say the same: "Claude treats your design system as higher precedence than its own choices, and your prompt as higher precedence than both" [5].
  - A ban list that names what `frontend-design` no longer does: "a purple-to-blue gradient hero on white; Inter or Space Grotesk as the 'safe' face; emoji as section markers; everything centered; `rounded-lg` everywhere; accent bar/rail on rounded cards" [9].

  Practical consequence: if we later publish eval dashboards or case-study pages as artifacts, a pointer to our tokens in `CLAUDE.md` keeps those pages on-system.
- **`dataviz`** is chart guidance with a "brand-neutral placeholder palette that you replace with your own" [6]. It's only relevant if a generated screen gets a chart. If one does, the placeholder palette must be swapped for our tokens, or it becomes a default.
- **`artifact-diagramming`, `/slides`**: not relevant.

## 4. How skills load (mechanics that shape the recipe)

From [10]:

- Model-invocable skills keep their description in context, and the full body loads when the skill is invoked. Plugin skills are namespaced, so `frontend-design` is `/frontend-design:frontend-design`.
- An invoked skill "enters the conversation as a single message and stays there across later turns... Claude Code does not re-read the skill file". After compaction, the most recent invocation of each skill is re-attached, capped at 5,000 tokens each and 25,000 combined, with the most recent first. `frontend-design` is about 9.2 KB, roughly 2.3k tokens, so it survives intact unless many skills were invoked after it.
- Stacking: at the terminal, `/skill-a /skill-b args` loads both (up to six). **Through `claude -p` or the Agent SDK, only the first skill loads.** A headless build loop can't rely on stacking.
- Order matters for overrides: whatever comes later in context and is more specific should restate precedence. `frontend-design` already says the brief wins, so put the brief and our override table *after* it.

## Recommendation (feeds #13)

Build a project skill, `.claude/skills/build-component/SKILL.md`, as the single entry point for each component session (one component per session). Its steps, in order:

1. **Load `frontend-design` first.** Invoke it through the Skill tool (`frontend-design:frontend-design`) as step 1 of our skill, not by stacking, so it works the same in `claude -p` and the Agent SDK.
2. **Then load the authority**: `docs/design-brief.md`, the token JSON, and relevant ADRs in `docs/adr/`. State plainly: "The brief and tokens override frontend-design wherever they speak, per frontend-design's own rule."
3. **Apply this override table to `frontend-design`'s page-oriented steps:**
   - *Design plan* becomes the component plan: which **existing** tokens it uses (no new hex, font, size or duration), variants, sizes and states (hover, focus, active, disabled, loading, error), the a11y contract, and which motion tokens fire on which user action.
   - *Hero / one memorable thing / aesthetic risk* becomes: the system's signature lives where the brief puts it (motion). A component is quiet unless the brief says otherwise. No per-component flourishes.
   - *Confirm with the client* becomes: never ask. Where the brief is silent, choose, and log an ADR marked "would hand to a designer".
   - *Keep as written*: the review pass against defaults (retargeted: "would I build this exact Button for any SaaS?"), the ban list, the copy rules, the quality floor, screenshot critique, and the CSS specificity warning.
4. **Build, then run gates 2, 4, 6 and 7 inside the session.** Feed failures back as follow-up turns.
5. **Never invoke `/design`, `/design-sync` or publish artifacts in a component session.** Headless sessions are already safe because artifacts are off in `-p`/SDK. For interactive sessions, put this line in the skill.

**What the design brief (#2) must add, because `frontend-design` no longer covers it:**

- Named font bans: Inter, Geist, Roboto, Arial, system-ui as the brand face, Space Grotesk.
- Palette bans: Tailwind palette names as the palette, purple/indigo-to-blue gradients, `#D97757`-ish terracotta.
- Silhouette bans: shadcn defaults, `rounded-lg` everywhere, the 8px-grid indigo button.
- Explicit calls on the axes where our references disagree or the domain tempts a skill ban: pure black vs tinted near-black; monospace or tabular figures for amounts; ALL-CAPS table headers.

Restate the 12 `frontend-design` bans verbatim, credited to Anthropic (Apache 2.0), so the brief carries them even if the skill changes again. It changed twice in 2026.

## Sources

1. `anthropics/skills`, `skills/frontend-design/SKILL.md` at commit `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f` (2026-09-03). https://github.com/anthropics/skills/blob/41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f/skills/frontend-design/SKILL.md
2. PR #1713 "Update frontend-design skill to avoid generic design defaults". https://github.com/anthropics/skills/pull/1713
3. Earlier versions: `00756142` (2025-12-04) and `2235be7c` (2026-06-09). https://github.com/anthropics/skills/commits/main/skills/frontend-design/SKILL.md
4. `anthropics/claude-plugins-official`, `plugins/frontend-design/skills/frontend-design/SKILL.md` (identical to [1]).
5. Claude Code docs, "Share session output as artifacts" (Improve the visual design; Draft a design canvas; Availability). https://code.claude.com/docs/en/artifacts
6. Claude Code docs, "Commands" (`/design`, `/design-sync`, `/design-login`, `/dataviz`, `/artifact-*`). https://code.claude.com/docs/en/commands
7. Claude Code changelog, 2.1.302 (Claude Design closure notice); also "the bundled artifact-design skill now asks Claude for plain, direct prose". https://code.claude.com/docs/en/changelog
8. Claude Code What's New, week 34 (2026-08-17 to 21), `/design` research preview. https://code.claude.com/docs/en/whats-new/2026-w34
9. Bundled `artifact-design` skill text and the Artifact tool definition, as loaded in a Claude Code v2.1.305 session on 2026-10-21. These are first-party but not published on the web. Quotes are from the loaded text.
10. Claude Code docs, "Skills" (invocation, context lifetime, compaction budget, stacking). https://code.claude.com/docs/en/skills
