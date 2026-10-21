// PROTOTYPE (wayfinder #15): body of every figma:sync-tokens variable script.
// sync.mjs prepends `const DRY_RUN = …; const PLANS = […];` and appends the
// driver; the agent runs the result verbatim through use_figma. Upserts by stable name, never duplicates,
// reports orphans but never deletes them.
const r4 = (x) => (typeof x === "number" ? Math.round(x * 1e4) / 1e4 : x);
const norm = (v) => (v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort().map(([k, x]) => [k, norm(x)])) : r4(v));
const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));

async function syncCollection(PLAN) {
  const diff = { collection: PLAN.name, created: [], updated: [], unchanged: 0, modesAdded: [], orphans: [] };
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let coll = collections.find((c) => c.name === PLAN.name);
  if (!coll) {
    diff.collectionCreated = true;
    if (DRY_RUN) return { ...diff, created: PLAN.variables.map((v) => v.name) };
    coll = figma.variables.createVariableCollection(PLAN.name);
    coll.renameMode(coll.modes[0].modeId, PLAN.modes[0]);
  }
  if (!DRY_RUN && coll.hiddenFromPublishing !== PLAN.hidden) coll.hiddenFromPublishing = PLAN.hidden;

  const modeId = Object.fromEntries(coll.modes.map((m) => [m.name, m.modeId]));
  for (const m of PLAN.modes) if (!modeId[m]) {
    diff.modesAdded.push(m);
    if (!DRY_RUN) modeId[m] = coll.addMode(m);
  }

  const all = await figma.variables.getLocalVariablesAsync();
  const mine = all.filter((v) => v.variableCollectionId === coll.id);
  const byName = new Map(mine.map((v) => [v.name, v]));
  // Aliases point into Primitives by name.
  const prim = collections.find((c) => c.name === "Primitives");
  const primByName = new Map(all.filter((v) => prim && v.variableCollectionId === prim.id).map((v) => [v.name, v]));
  const resolve = (val) => {
    if (!val || typeof val !== "object" || !("alias" in val)) return val;
    const target = primByName.get(val.alias);
    if (!target) throw new Error(`alias target missing: ${val.alias}`);
    return { type: "VARIABLE_ALIAS", id: target.id };
  };

  for (const t of PLAN.variables) {
    let v = byName.get(t.name);
    if (v && v.resolvedType !== t.type) throw new Error(`type drift: ${t.name} ${v.resolvedType} -> ${t.type}`);
    const wantMode = Object.fromEntries(PLAN.modes.map((m) => [m, DRY_RUN && !modeId[m] ? t.valuesByMode[m] : resolve(t.valuesByMode[m])]));
    const changes = !v ? ["*"] : [
      ...PLAN.modes.filter((m) => !modeId[m] || !same(v.valuesByMode[modeId[m]], wantMode[m])).map((m) => `value:${m}`),
      ...(!t.scopes || same([...v.scopes].sort(), [...t.scopes].sort()) ? [] : ["scopes"]),
      ...(same(v.codeSyntax, t.codeSyntax ?? {}) ? [] : ["codeSyntax"]),
    ];
    if (!changes.length) { diff.unchanged++; continue; }
    if (v) diff.updated.push(`${t.name} (${changes.join(",")})`); else diff.created.push(t.name);
    if (DRY_RUN) continue;
    if (!v) v = figma.variables.createVariable(t.name, coll, t.type);
    for (const m of PLAN.modes) v.setValueForMode(modeId[m], wantMode[m]);
    if (t.scopes) v.scopes = t.scopes;
    for (const [platform, syntax] of Object.entries(t.codeSyntax ?? {})) v.setVariableCodeSyntax(platform, syntax);
  }

  if (PLAN.allNames) {
    const wanted = new Set(PLAN.allNames);
    diff.orphans = mine.filter((v) => !wanted.has(v.name)).map((v) => ({ name: v.name, id: v.id }));
  }
  return { ...diff, dryRun: DRY_RUN, collectionId: coll.id, modes: modeId, variableCount: coll.variableIds.length };
}
