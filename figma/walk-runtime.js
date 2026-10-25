/* global figma */
// The fixed body of every figma:walk-capture script (ADR 0007). It reads, and
// never writes: for each captured frame it reports the modes the capture
// pinned and the variables bound anywhere under it, grouped by kind.

// boundVariables fields by kind: the kinds a capture of a screen must bind for
// the walk to pass. Anything else a capture binds is "other".
const KINDS = {
  colour: ["fills", "strokes", "textRangeFills"],
  spacing: [
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "paddingBottom",
    "itemSpacing",
    "counterAxisSpacing",
  ],
  radius: [
    "topLeftRadius",
    "topRightRadius",
    "bottomLeftRadius",
    "bottomRightRadius",
  ],
  type: [
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "letterSpacing",
    "lineHeight",
    "paragraphSpacing",
    "paragraphIndent",
  ],
};
// An opaque, visible solid paint with no variable is a binding the capture
// missed. Alpha paints never bind, so they aren't listed. Text whose ranges
// differ reports figma.mixed, which is named for the human to check.
const literalPaints = (node) =>
  ["fills", "strokes"].flatMap((field) => {
    if (node[field] === figma.mixed) return [`${node.name} ${field} mixed`];
    return (Array.isArray(node[field]) ? node[field] : [])
      .filter(
        (paint) =>
          paint.type === "SOLID" &&
          paint.visible !== false &&
          (paint.opacity ?? 1) === 1 &&
          !paint.boundVariables?.color
      )
      .map(
        ({ color }) =>
          `${node.name} ${field} rgb(${[color.r, color.g, color.b].map((c) => Math.round(c * 255)).join(",")})`
      );
  });

const kindOf = (field) =>
  Object.keys(KINDS).find((kind) => KINDS[kind].includes(field)) ?? "other";

// figma/walk-capture.ts appends the call.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function walkCapture(IDS) {
  const variableNames = new Map();
  const variableName = async (id) => {
    if (!variableNames.has(id)) {
      const variable = await figma.variables.getVariableByIdAsync(id);
      variableNames.set(id, variable ? variable.name : id);
    }
    return variableNames.get(id);
  };

  const frames = [];
  for (const id of IDS) {
    const root = await figma.getNodeByIdAsync(id);
    if (!root) throw new Error(`figma:walk-capture: no node ${id}`);

    const modes = {};
    const bound = Object.fromEntries(
      [...Object.keys(KINDS), "other"].map((kind) => [kind, []])
    );
    const literal = [];
    const visit = async (node) => {
      for (const [collectionId, modeId] of Object.entries(
        node.explicitVariableModes ?? {}
      )) {
        const collection =
          await figma.variables.getVariableCollectionByIdAsync(collectionId);
        const name = collection ? collection.name : collectionId;
        const mode = collection?.modes.find((m) => m.modeId === modeId);
        modes[name] = [
          ...new Set([...(modes[name] ?? []), mode?.name ?? modeId]),
        ];
      }
      for (const [field, aliases] of Object.entries(
        node.boundVariables ?? {}
      )) {
        for (const alias of [aliases].flat()) {
          bound[kindOf(field)].push(await variableName(alias.id));
        }
      }
      literal.push(...literalPaints(node));
      for (const child of node.children ?? []) await visit(child);
    };
    await visit(root);

    for (const kind of Object.keys(bound)) {
      bound[kind] = [...new Set(bound[kind])].sort();
    }
    for (const name of Object.keys(modes)) modes[name].sort();
    frames.push({
      id,
      name: root.name,
      modes,
      bound,
      missing: Object.keys(KINDS).filter((kind) => !bound[kind].length),
      literal,
    });
  }
  return { frames };
}
