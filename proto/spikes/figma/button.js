// PROTOTYPE (wayfinder #15): Button component set bound to the synced variables,
// plus a mode-pinning frame. Run verbatim through use_figma after the token sync.
// Re-runnable: finds the page, set, variants and preview frame by name.
const VARIANTS = [
  { name: "intent=primary", bg: "color/bg/accent", fg: "color/text/on-accent", border: null },
  { name: "intent=secondary", bg: "color/bg/surface", fg: "color/text/ink", border: "color/border/control" },
  // Added on the second run to test appendChild into an existing set (spike only; disabled is its own axis in code).
  { name: "intent=disabled", bg: "color/bg/disabled", fg: "color/text/disabled", border: null },
];
const PREVIEWS = [["Light", "Admin"], ["Dark", "Admin"], ["Light", "Contractor"], ["Dark", "Contractor"]];
const STRAY = "VariableID:5:143"; // space/legacy from the drift test; delete by exact id only

const vars = new Map((await figma.variables.getLocalVariablesAsync()).map((v) => [v.name, v]));
const need = (n) => { const v = vars.get(n); if (!v) throw new Error(`missing variable ${n}`); return v; };
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const coll = (n) => collections.find((c) => c.name === n);
const paint = (n) => figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", need(n));
const label = (await figma.getLocalTextStylesAsync()).find((s) => s.name === "label");
await figma.loadFontAsync({ family: "Instrument Sans", style: "Regular" });
await figma.loadFontAsync({ family: "Instrument Sans", style: "SemiBold" });

const stray = await figma.variables.getVariableByIdAsync(STRAY);
if (stray) stray.remove();

let page = figma.root.children.find((p) => p.name === "Components");
if (!page) { page = figma.root.children[0]; page.name = "Components"; }
await figma.setCurrentPageAsync(page);

function build(c, s) {
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "AUTO";
  c.counterAxisSizingMode = "AUTO";
  c.primaryAxisAlignItems = "CENTER";
  c.counterAxisAlignItems = "CENTER";
  c.setBoundVariable("paddingLeft", need("space/sm"));
  c.setBoundVariable("paddingRight", need("space/sm"));
  c.setBoundVariable("paddingTop", need("space/3xs"));
  c.setBoundVariable("paddingBottom", need("space/3xs"));
  c.setBoundVariable("itemSpacing", need("space/2xs"));
  c.setBoundVariable("minHeight", need("density/target"));
  c.setBoundVariable("minWidth", need("density/target"));
  for (const f of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) c.setBoundVariable(f, need("radius/control"));
  c.fills = [paint(s.bg)];
  c.strokes = s.border ? [paint(s.border)] : [];
  c.strokeWeight = 1;
  let text = c.findOne((n) => n.type === "TEXT" && n.name === "label");
  if (!text) { text = figma.createText(); text.name = "label"; c.appendChild(text); }
  return text;
}
async function finish(text, s) {
  await text.setTextStyleIdAsync(label.id);
  text.characters = "Approve and pay";
  text.fills = [paint(s.fg)];
}

let set = page.findOne((n) => n.type === "COMPONENT_SET" && n.name === "Button");
const created = [];
const updated = [];
if (!set) {
  const comps = [];
  for (const s of VARIANTS) {
    const c = figma.createComponent(); c.name = s.name;
    await finish(build(c, s), s);
    comps.push(c); created.push(c.id);
  }
  set = figma.combineAsVariants(comps, page);
  set.name = "Button";
  set.x = 0; set.y = 0;
} else {
  for (const s of VARIANTS) {
    let c = set.children.find((n) => n.name === s.name);
    if (!c) { c = figma.createComponent(); c.name = s.name; set.appendChild(c); created.push(c.id); } else updated.push(c.id);
    await finish(build(c, s), s);
  }
}
set.layoutMode = "HORIZONTAL";
set.primaryAxisSizingMode = "AUTO";
set.counterAxisSizingMode = "AUTO";
set.itemSpacing = 24;
set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 24;

// Preview frame: one row per theme x density, each pinned to explicit modes on two collections.
let preview = page.findOne((n) => n.type === "FRAME" && n.name === "Button / modes");
if (!preview) { preview = figma.createAutoLayout("VERTICAL", { name: "Button / modes", itemSpacing: 0 }); page.appendChild(preview); }
for (const child of [...preview.children]) child.remove(); // rebuilt each run; only ever holds our instances
preview.x = set.x; preview.y = set.y + set.height + 80;
const pins = [];
for (const [theme, density] of PREVIEWS) {
  const row = figma.createAutoLayout("HORIZONTAL", { name: `${theme} / ${density}`, itemSpacing: 16 });
  row.paddingLeft = row.paddingRight = row.paddingTop = row.paddingBottom = 24;
  row.fills = [paint("color/bg/page")];
  preview.appendChild(row);
  row.setExplicitVariableModeForCollection(coll("Color"), coll("Color").modes.find((m) => m.name === theme).modeId);
  row.setExplicitVariableModeForCollection(coll("Density"), coll("Density").modes.find((m) => m.name === density).modeId);
  for (const c of set.children) row.appendChild(c.createInstance());
  const inst = row.children[0];
  pins.push({ row: row.name, h: inst.height, labelSize: inst.findOne((n) => n.type === "TEXT").fontSize, fill: inst.fills[0].color });
}

const bindings = set.children.map((c) => ({
  name: c.name,
  bound: Object.keys(c.boundVariables ?? {}).sort(),
  fill: !!c.fills[0]?.boundVariables?.color,
  stroke: c.strokes.length ? !!c.strokes[0]?.boundVariables?.color : null,
  textStyle: c.findOne((n) => n.type === "TEXT").textStyleId === label.id,
}));
return { setId: set.id, previewId: preview.id, created, updated, variantCount: set.children.length, bindings, pins, strayRemoved: !!stray };
