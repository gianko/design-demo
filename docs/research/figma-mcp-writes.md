# Research: Figma MCP write and capture details

Resolves #8 (feeds #12 token format, #15 Figma spike; demo brief §3, §7). Researched 2026-10-21 against developers.figma.com, help.figma.com, the Figma Plugin API reference, and Figma's own agent skills in `figma/mcp-server-guide` at `056adaf`.

**Question.** What are the facts about the official remote MCP server's write paths (`use_figma`, `generate_figma_design`) and its read budget that the Figma spike and the token pipeline depend on?

## TL;DR

- **Captures bind to local variables. No published library is needed.** The help article on code-to-canvas binding says it considers "variables that were created in the file" and "variables inside libraries that have been added to the file" [S6]. Matching goes in this order: the CSS custom property name from the page against the Figma variable's **code syntax**, then against the Figma variable **name**, then the "best matching and most limited variable scope" [S6]. So the token sync must set `codeSyntax.WEB` on every variable, and set scopes. It works on color, number and string variables only. **Color variables with opacity are never bound** [S6].
- **The 20 KB cap is on output, not on the code you send.** "Each tool call can return up to 20 KB of output" [S1][S7]. It limits what a script `return`s. The size of the Plugin API code that `use_figma` accepts is **not documented**. #15 assumes a 20 KB cap on code; that is a misreading. The real practical limit is a script time limit ("Script exceeded time limit"), and Figma's skill advises "at most 20–30 variables per call" [S10].
- **Idempotency is a pattern, not a feature.** Figma's skills do check-before-create by deterministic name: collection by name, mode by name, variable by name within its collection, component set by name. They return IDs from every call and keep run state **outside** the file [S9][S10]. Sketches below.
- **Pricing:** write to canvas is "free during the beta period and will eventually become a usage-based paid feature". No date is given [S1][S7][S8].
- **Read budget:** on a Pro Full seat it is 200 calls/day and 10/min, and "Rate limits apply to tools that read data from Figma". `generate_figma_design`, `create_new_file`, `whoami` and `add_code_connect_map` are exempt [S3]. **Whether `use_figma` counts isn't documented**: the exempt list says "such as" and doesn't name it. The cheapest verification is **no extra call at all**: the write script `return`s its own counts, names and IDs, which Figma's skill calls structural validation [S9]. If a separate read is needed, use `get_metadata` (a "lightweight XML outline") [S4].
- **Surprises:** (1) Figma variables support `TIMING` and `EASING` types, so motion tokens can be variables too [S11]. (2) Pro now allows **10 modes per collection**, not the 4 that Figma's own skill still states [S12][S9]. (3) Figma's `figma-generate-design` skill treats a capture as a throwaway visual reference to rebuild from library instances [S13]. The brief keeps captures as the deliverable, which is fine, but it means captures will never contain component instances.

## `use_figma` (Write to canvas)

| Fact | Source |
| --- | --- |
| Runs agent-written JS in the file through the Plugin API. Creates real frames, components, variants, variables and auto layout | [S1] |
| Plans: Professional, Education, Organization, Enterprise. Needs edit access and the **remote** server | [S1] |
| Beta, free during beta, then usage-based. No date given | [S1][S7][S8] |
| **Output** per tool call ≤ 20 KB. In Claude Code a bigger response can also fail with "exceeds maximum allowed tokens (25000)", and `MAX_MCP_OUTPUT_TOKENS` raises that limit | [S1][S7] |
| Can't add new images (`upload_assets` does). Fonts must be uploaded to the Figma account, because local-only fonts aren't available | [S1][S4] |
| Remote-only tools: `use_figma`, `generate_figma_design`, `create_new_file`, `upload_assets`, `html_to_figma`, `whoami` | [S4] |
| Script contract: plain JS with top-level `await`; output through `return` (JSON-serialized); `console.log` is not returned; `figma.notify` throws; no state persists across calls, so pass IDs as string literals | [S9] |
| Page context resets to the first page on every call; use `await figma.setCurrentPageAsync(page)` | [S9] |
| On error, follow `safeToRetryWithoutCanvasRead` | [S9] |
| Calls take a `skillNames` logging parameter (`"figma-use"`), and the skill asks for `create_session` first "when available". Schema details aren't on developers.figma.com | [S9] |
| Mode limit errors come from `addMode` as "in addMode: Limited to N modes only", based on "the file's pricing tier". That supports the brief's "limits follow the file's location" | [S11b] |

### Idempotent re-runs: how Figma's own skills do it

From `figma-generate-library` [S10]:

- **Stable identity:** a collection by name; a variable by `name` + `variableCollectionId`; a page or component set by deterministic name; a style by name.
- "**Idempotency check** before every create: query by name + state ledger ID. If exists, skip or update — never duplicate."
- "Do not store workflow state on Figma objects." It keeps a state ledger (`{key → id}`) on disk instead. So plugin data is not the recommended approach, though the API has it.
- "**Never clean up by a name or prefix.**" Delete only by exact IDs you recorded. For us: report orphans (in Figma but not in the token JSON) and delete only behind an explicit `--prune` flag.
- Timeouts: "script timeout when creating many variables. Fix: batch variable creation — create at most 20–30 variables per call."
- Contradiction inside Figma's own skills: `figma-generate-library` says "NEVER parallelize `use_figma` calls", while `figma-use` recommends parallel fan-out for multi-page work [S9][S10]. For a sync script, go sequential.

### Sketch A: variable collection with Light/Dark modes, upsert by stable name

One `use_figma` call. The sync script injects `TOKENS` from the token JSON and chunks it to ≤ 25 variables per call. Setting `DRY_RUN = true` makes the same script compute the diff without writing.

```js
// Injected by figma:sync-tokens
const DRY_RUN = false;
const COLLECTION = "Color";                    // stable name
const MODES = ["Light", "Dark"];               // stable mode names; order = default first
const TOKENS = [
  { name: "color/bg/default", type: "COLOR", scopes: ["FRAME_FILL", "SHAPE_FILL"],
    cssVar: "--color-bg-default",
    values: { Light: { r: 1, g: 1, b: 1, a: 1 }, Dark: { r: 0.07, g: 0.07, b: 0.08, a: 1 } } },
  { name: "color/text/default", type: "COLOR", scopes: ["TEXT_FILL"],
    cssVar: "--color-text-default",
    values: { Light: { r: 0.1, g: 0.1, b: 0.12, a: 1 }, Dark: { r: 0.93, g: 0.93, b: 0.95, a: 1 } } },
];

const r4 = x => typeof x === "number" ? Math.round(x * 1e4) / 1e4 : x;
const norm = v => v && typeof v === "object" && !("type" in v)
  ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, r4(x)])) : r4(v);
const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
const diff = { collection: "unchanged", modesAdded: [], created: [], updated: [], unchanged: [], orphans: [] };

// 1. Collection by stable name
let coll = (await figma.variables.getLocalVariableCollectionsAsync()).find(c => c.name === COLLECTION);
if (!coll) {
  diff.collection = "created";
  if (DRY_RUN) return { ...diff, created: TOKENS.map(t => t.name) };
  coll = figma.variables.createVariableCollection(COLLECTION);
  coll.renameMode(coll.modes[0].modeId, MODES[0]);   // new collections start with "Mode 1"
}

// 2. Modes by name
const modeId = Object.fromEntries(coll.modes.map(m => [m.name, m.modeId]));
for (const m of MODES) if (!modeId[m]) {
  diff.modesAdded.push(m);
  if (!DRY_RUN) modeId[m] = coll.addMode(m);         // throws "Limited to N modes only" past plan cap
}

// 3. Variables by name within this collection
const existing = (await figma.variables.getLocalVariablesAsync()).filter(v => v.variableCollectionId === coll.id);
const byName = new Map(existing.map(v => [v.name, v]));
for (const t of TOKENS) {
  let v = byName.get(t.name);
  const isNew = !v;
  if (v && v.resolvedType !== t.type) throw new Error(`type drift: ${t.name} ${v.resolvedType} -> ${t.type}`);
  const web = `var(${t.cssVar})`;
  const changes = isNew ? ["*"] : [
    ...MODES.filter(m => !same(v.valuesByMode[modeId[m]], t.values[m])).map(m => `value:${m}`),
    ...(same(v.scopes, t.scopes) ? [] : ["scopes"]),
    ...(v.codeSyntax.WEB === web ? [] : ["codeSyntax"]),
  ];
  if (!changes.length) { diff.unchanged.push(t.name); continue; }
  (isNew ? diff.created : diff.updated).push(isNew ? t.name : `${t.name} (${changes.join(",")})`);
  if (DRY_RUN) continue;
  if (isNew) v = figma.variables.createVariable(t.name, coll, t.type);
  for (const m of MODES) v.setValueForMode(modeId[m], t.values[m]);
  v.scopes = t.scopes;                       // never leave ALL_SCOPES
  v.setVariableCodeSyntax("WEB", web);       // what code-to-canvas matches first
}
const wanted = new Set(TOKENS.map(t => t.name));
diff.orphans = existing.filter(v => !wanted.has(v.name)).map(v => ({ name: v.name, id: v.id })); // report, don't delete

return { ...diff, collectionId: coll.id, modes: modeId, variableCount: coll.variableIds.length };
```

API facts this relies on: `createVariableCollection(name)`, `createVariable(name, collection, resolvedType)`, `getLocalVariableCollectionsAsync()`, `getLocalVariablesAsync(type?)` [S11]; `addMode` returns the new mode ID, `renameMode` [S11b]; `setValueForMode`, `scopes`, `setVariableCodeSyntax('WEB', ...)`, `valuesByMode` [S9][S11]. COLOR variable values are `{r,g,b,a}` in the 0–1 range; paint colors are `{r,g,b}` without `a` [S9]. Aliases (semantic → primitive) are `{ type: 'VARIABLE_ALIAS', id }` [S9]. Comparing an alias needs the `"type" in v` guard above.

### Sketch B: component set with two variants, fills bound to variables

Run after Sketch A. One call, and safe to re-run. It rebuilds each variant's bindings in place and never duplicates the set.

```js
const PAGE = "Components", SET = "Button", FONT = { family: "<brand font>", style: "Medium" };
const VARIANTS = [
  { name: "variant=primary",   bg: "color/action/primary/bg",   fg: "color/action/primary/fg" },
  { name: "variant=secondary", bg: "color/action/secondary/bg", fg: "color/action/secondary/fg" },
];

const vars = new Map((await figma.variables.getLocalVariablesAsync()).map(v => [v.name, v]));
const need = n => { const v = vars.get(n); if (!v) throw new Error(`missing variable ${n}`); return v; };
const fill = n => figma.variables.setBoundVariableForPaint(               // returns a NEW paint
  { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", need(n));

let page = figma.root.children.find(p => p.name === PAGE);
if (!page) { page = figma.createPage(); page.name = PAGE; }
await figma.setCurrentPageAsync(page);                                     // once per call
await figma.loadFontAsync(FONT);                                           // before any text op

function build(c, s) {
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "AUTO";
  for (const f of ["paddingLeft", "paddingRight"]) c.setBoundVariable(f, need("space/4"));
  for (const f of ["paddingTop", "paddingBottom"]) c.setBoundVariable(f, need("space/2"));
  for (const f of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"])
    c.setBoundVariable(f, need("radius/control"));
  c.fills = [fill(s.bg)];
  let label = c.findOne(n => n.type === "TEXT" && n.name === "label");
  if (!label) { label = figma.createText(); label.name = "label"; c.appendChild(label); }
  label.fontName = FONT;
  label.characters = "Pay invoice";
  label.fills = [fill(s.fg)];
  return c;
}

let set = page.findOne(n => n.type === "COMPONENT_SET" && n.name === SET);
const created = [];
if (!set) {
  const comps = VARIANTS.map(s => { const c = figma.createComponent(); c.name = s.name; created.push(c.id); return build(c, s); });
  set = figma.combineAsVariants(comps, page);   // ComponentNodes only, same page
  set.name = SET;
  set.x = Math.max(0, ...page.children.filter(n => n !== set).map(n => n.x + n.width)) + 200; // off (0,0)
} else {
  for (const s of VARIANTS) {
    let c = set.children.find(n => n.name === s.name);
    if (!c) { c = figma.createComponent(); c.name = s.name; set.appendChild(c); created.push(c.id); }
    build(c, s);
  }
}
set.children.forEach((c, i) => { c.x = 24 + i * (c.width + 24); c.y = 24; }); // variants stack at (0,0) otherwise
const last = set.children[set.children.length - 1];
set.resizeWithoutConstraints(last.x + last.width + 24, Math.max(...set.children.map(c => c.height)) + 48);

return { setId: set.id, created, variants: set.children.map(c => ({ id: c.id, name: c.name,
  fillBound: !!c.fills[0]?.boundVariables?.color })) };
```

To show dark mode next to light, add a frame with `frame.setExplicitVariableModeForCollection(collection, darkModeId)` that holds one instance per variant. Without an explicit mode, nodes use the collection's default (first) mode [S9][S11c].

API facts: `combineAsVariants(nodes: ComponentNode[], parent, index?)`. The list "must be non-empty, and must consist of only component nodes", and "Grouped nodes must be in the same page as the parent" [S11d]. Variant names use `Property=Value` [S9]. `setBoundVariable(field, variable)` takes node fields (padding, radii, gap, size, opacity, strokeWeight, …) **and** text fields (`fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, …). Passing a variable ID instead of a `Variable` is deprecated [S11e]. Figma's `variable-patterns.md` says `fontSize`/`fontWeight`/`lineHeight` are *not* bindable [S9], which contradicts the typings. Trust the typings, and let the spike confirm.

## `generate_figma_design` (Code to canvas)

| Fact | Source |
| --- | --- |
| Captures live UI from a browser into editable layers. One screen or a whole flow per session | [S2] |
| The agent starts the local server, "adds the script that code to canvas needs" and opens a browser window; the first capture runs automatically, and a toolbar captures the whole screen or one element, including states | [S2] |
| Destinations: a new file (drafts), an **existing Design file** (needs edit access; if the link isn't a Design file it creates a new one), or the clipboard | [S2] |
| Plans: Starter and above. Clients include Claude Code. Remote server only | [S2] |
| **Exempt from rate limits** | [S3][S4] |
| Output is "flat layers with no connection to your libraries", meaning **no component instances**. Variables are the exception: "If the file you capture to has a library with variables, Figma automatically binds matching color, number, and string variables" | [S1][S2] |
| Bound variables include **local** ones ("variables that were created in the file"). The order is code syntax ← CSS var name, then Figma name ← CSS var name, then best-matching, most-limited scope | [S6] |
| Bindable: frame fills/strokes, stroke weight, radius, padding, gap, opacity; text color, font family, size, weight, line height, letter spacing; vector fills/strokes | [S6] |
| Won't bind: color variables with opacity; names that a build step shortened or scrambled. "Dev servers typically preserve readable variable names" | [S6] |
| Heavy JS animation, `<canvas>` and virtualized lists "may not translate cleanly" | [S6] |
| Remote/desktop clash: if the desktop server (`127.0.0.1:3845`) is also configured, the remote-only tools may not load. Fix with `claude mcp remove figma-desktop` | [S2][S7] |

**Local vs published, answered.** Local variables in the target file are enough [S6]. The developer-docs wording ("has a library with variables", "add the library to the file") reads as if a library were required, but the help article explicitly includes file-local variables. The help article describes the binding feature in general ("pasted designs"); it doesn't name the MCP tool. *Spike must confirm* that MCP captures take the same binding path.

**Implications for the token build (#12):**

- Emit CSS custom properties whose names equal each Figma variable's `codeSyntax.WEB`, e.g. `--color-bg-default` ↔ `var(--color-bg-default)`. Name them all from one stable token path so CSS var, TS type and Figma variable can't drift apart.
- Avoid alpha in color tokens that should bind (make overlays solid, or accept them unbound). Keep variable names unmangled in the dev and Storybook builds.
- Set narrow scopes, because the last-resort match is by scope.
- Motion tokens can be Figma `TIMING`/`EASING` variables [S11], but captures only bind color, number and string.

**Storybook.** Nothing first-party mentions Storybook. The capture works on any running local URL [S2]. The sensible target is the story's standalone iframe URL (`http://localhost:6006/iframe.html?id=<story-id>&viewMode=story`), not the Storybook manager UI, so the capture doesn't include the sidebar or the iframe nesting. *Spike must confirm.*

## Read budget and the cheapest verification

- Pro, Full/Dev seat: **200/day, 10/min**; "Per-minute limits apply in addition to daily or monthly limits"; View/Collab: 20/month; "Figma may change rate limits at any time" [S3].
- "Rate limits apply to tools that read data from Figma." Exempt "such as": `add_code_connect_map`, `create_new_file`, `generate_figma_design`, `whoami`. Calls that use AI credits (`generate_image`, `send_prompt`) don't count either [S3][S7].
- The rate-limit page ties limits to "plan and seat" and doesn't mention file location [S3]. The mode cap does follow the file's tier [S11b]. So the brief's "limits follow the file's location" is right for feature limits; the docs don't say whether it holds for MCP rate limits.
- **Cheapest verification:**
  1. Zero extra calls. The write script returns the evidence (counts, names, mode names, `fillBound`), as Sketches A and B do. Figma's skill: "Return affected IDs and relevant counts, names, or bounds from each write—this counts as structural validation" [S9].
  2. If one read is required by §7, use `get_metadata` on the component-set node: a "lightweight XML outline … basic properties only" [S4]. It shows hierarchy and names, not bindings. `get_variable_defs` returns variables used in a selection, which suits checking a capture's bindings. `get_screenshot` is the most expensive [S4].
  3. For captures, `use_figma` read-only can walk the capture and count `boundVariables` without pulling design context. Whether that counts against the budget is undocumented.

## What feeds #12 (token format)

1. Stable token path → Figma variable `name` (slash-grouped, e.g. `color/bg/default`) → CSS var `--color-bg-default` → `codeSyntax.WEB = "var(--color-bg-default)"`. Use one naming function, used by both the CSS/TS build and the Figma sync.
2. Modes are named `Light`/`Dark` in one semantic collection. Primitives go in their own collection with a single mode, aliased (`VARIABLE_ALIAS`) and with `scopes = []` so they're hidden. Pro allows 10 modes per collection [S12].
3. Each token carries its Figma `type` (`COLOR`/`FLOAT`/`STRING`/`TIMING`/`EASING`) and `scopes`.
4. Shadows aren't variables; they're effect styles [S9]. Elevation tokens need a style path or must stay code-only.
5. Avoid alpha in color tokens that should bind on capture.

## What feeds #15 (spike)

- Shape of `figma:sync-tokens`: a generated, deterministic Plugin API script (Sketch A), injected with token JSON and executed verbatim through `use_figma`, chunked ≤ 25 variables per call, with a `DRY_RUN` flag that returns the diff. That beats a free-form skill, because re-runs are deterministic and the diff is real. Keep `figma-use` loaded for the agent's sake (the `skillNames` parameter).
- Correct the spike's framing: 20 KB caps the **return value**, not the script. Keep returns small (names + IDs, no node dumps).
- Order: variables → component set → capture into the same file.

## Spike must confirm

1. Captures through MCP `generate_figma_design` bind to **local** variables in the same file (the help article covers the general feature, not the MCP tool by name).
2. What code-syntax format the matcher compares: `var(--x)` vs `--x` vs `x`.
3. Which mode a captured frame resolves in, and whether a dark-mode capture binds to the same variables (with the frame mode set to `Dark` afterwards) or gets matched by value to the light values.
4. Whether `use_figma` calls (write or read-only) count toward the 200/day budget.
5. The maximum script size and execution time per `use_figma` call. Neither is documented; measure Sketch A's size at real token counts.
6. Whether the 20 KB output cap triggers on Sketch A's return for a full token set.
7. Whether `setBoundVariable` on text fields (`fontSize`, `lineHeight`, `fontFamily`) works through `use_figma`. The typings say yes; Figma's skill says no.
8. Whether `TIMING`/`EASING` variable types are available on Pro through `use_figma`.
9. Float round-tripping of color values (`valuesByMode` vs the injected value). The 1e-4 rounding in Sketch A is a guess.
10. Capturing a Storybook story via `iframe.html?id=…&viewMode=story` works, and the capture script can be injected into Storybook's dev server.
11. The current `use_figma` input schema (`code`, `fileKey`, `skillNames`, `create_session`/`sessionId`). It's described only in the skill, not on developers.figma.com.
12. Whether adding a component to an existing set with `set.appendChild(component)` is accepted (the docs only describe `combineAsVariants`).

## Sources

- [S1] Write to canvas — https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/
- [S2] Code to canvas — https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/
- [S3] Rate limits & access — https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/
- [S4] Tools and prompts — https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/
- [S5] Remote server installation — https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/ (Claude Code: `claude plugin install figma@claude-plugins-official`, or `claude mcp add --transport http figma https://mcp.figma.com/mcp`; OAuth on first connect)
- [S6] Help: Turn coded screens into editable design layers — https://help.figma.com/hc/en-us/articles/40826832449303
- [S7] Help: Figma MCP server FAQs — https://help.figma.com/hc/en-us/articles/39252411778583
- [S8] Blog: The Figma canvas is now open to agents — https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/
- [S9] `figma-use` skill + references (`SKILL.md`, `variable-patterns.md`, `component-patterns.md`), `figma/mcp-server-guide@056adaf` — https://github.com/figma/mcp-server-guide/tree/main/skills/figma-use ; help article: https://help.figma.com/hc/en-us/articles/39166810751895
- [S10] `figma-generate-library` skill (`SKILL.md` §3–4, `references/error-recovery.md`, `references/token-creation.md` §8) — https://github.com/figma/mcp-server-guide/tree/main/skills/figma-generate-library
- [S11] Plugin API `figma.variables` — https://developers.figma.com/docs/plugins/api/figma-variables/ ; Working with variables — https://developers.figma.com/docs/plugins/working-with-variables/ ; `VariableResolvedDataType` incl. `TIMING`/`EASING` in `plugin-api-standalone.d.ts` [S9]
- [S11b] Plugin API `VariableCollection` — https://developers.figma.com/docs/plugins/api/VariableCollection/
- [S11c] Plugin API node properties (`explicitVariableModes`, `setExplicitVariableModeForCollection`) — https://developers.figma.com/docs/plugins/api/node-properties/
- [S11d] Plugin API `figma.combineAsVariants` — https://developers.figma.com/docs/plugins/api/properties/figma-combineasvariants/
- [S11e] `setBoundVariable` signature and `VariableBindableNodeField` / `VariableBindableTextField` in `plugin-api-standalone.d.ts` [S9]
- [S12] Help: Choose a Figma plan (variable modes row: Professional "Up to 10 modes per collection") — https://help.figma.com/hc/en-us/articles/360040328273
- [S13] `figma-generate-design` skill, "Parallel Workflow with generate_figma_design" — https://github.com/figma/mcp-server-guide/tree/main/skills/figma-generate-design
