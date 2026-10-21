// PROTOTYPE (wayfinder #15): text and effect styles. sync.mjs passes
// `{ textStyles, effectStyles }` from the payload.
async function syncStyles(PLAN) {
  const vars = new Map((await figma.variables.getLocalVariablesAsync()).map((v) => [v.name, v]));
  const need = (n) => { const v = vars.get(n); if (!v) throw new Error(`missing variable ${n}`); return v; };
  const diff = { text: { created: [], rebound: [], unchanged: 0 }, effect: { created: [], updated: [], unchanged: 0 } };
  if (DRY_RUN && !vars.has("type/family")) return { text: { created: PLAN.textStyles.map((s) => s.name) }, effect: { created: PLAN.effectStyles.map((s) => s.name) }, dryRun: true };

  // fontFamily/fontWeight bindings need every resolvable font loaded first.
  const family = need("type/family");
  const familyName = Object.values(family.valuesByMode)[0];
  for (const style of ["Regular", "SemiBold"]) await figma.loadFontAsync({ family: familyName, style });

  const texts = await figma.getLocalTextStylesAsync();
  for (const s of PLAN.textStyles) {
    let st = texts.find((x) => x.name === s.name);
    const bound = st ? st.boundVariables ?? {} : {};
    const stale = Object.entries(s.bind).filter(([f, n]) => bound[f]?.id !== need(n).id).map(([f]) => f);
    if (!stale.length) { diff.text.unchanged++; continue; }
    (st ? diff.text.rebound : diff.text.created).push(st ? `${s.name} (${stale.join(",")})` : s.name);
    if (DRY_RUN) continue;
    if (!st) { st = figma.createTextStyle(); st.name = s.name; st.fontName = { family: familyName, style: "Regular" }; }
    for (const [field, n] of Object.entries(s.bind)) st.setBoundVariable(field, need(n));
  }

  const effects = await figma.getLocalEffectStylesAsync();
  const effect = (e) => ({ type: e.type, color: e.color, offset: e.offset, radius: e.radius, spread: e.spread, visible: true, blendMode: "NORMAL" });
  for (const s of PLAN.effectStyles) {
    let st = effects.find((x) => x.name === s.name);
    const want = s.effects.map(effect);
    if (st && JSON.stringify(st.effects.map((e) => [e.offset, e.radius, e.spread])) === JSON.stringify(want.map((e) => [e.offset, e.radius, e.spread]))) { diff.effect.unchanged++; continue; }
    (st ? diff.effect.updated : diff.effect.created).push(s.name);
    if (DRY_RUN) continue;
    if (!st) { st = figma.createEffectStyle(); st.name = s.name; }
    st.effects = want;
  }
  return { ...diff, dryRun: DRY_RUN };
}
