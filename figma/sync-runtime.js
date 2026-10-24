/* global figma */
// The fixed body of every figma:sync-tokens script (ADR 0007). It upserts the
// payload's variables, text styles and effect styles by stable name, reports
// orphans without deleting them, and deletes only the orphan IDs RUN.prune
// names. In a dry run it returns the diff and writes nothing. use_figma rolls
// back everything a call wrote if it throws, so a sync is all or nothing.

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// Figma stores floats as float32; 1e-4 is well clear of the round trip.
function same(a, b) {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-4;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => same(item, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = Object.keys(a).sort();
    return (
      keys.join("\n") === Object.keys(b).sort().join("\n") &&
      keys.every((key) => same(a[key], b[key]))
    );
  }
  return a === b;
}

const sameSet = (a, b) => same([...a].sort(), [...b].sort());

// figma/sync-tokens.ts appends the call.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function syncTokens(RUN, PAYLOAD, CHECKSUM) {
  // The agent re-types this script into use_figma, so it guards its own data.
  const actual = fnv1a(JSON.stringify([RUN, PAYLOAD]));
  if (actual !== CHECKSUM) {
    throw new Error(
      `figma:sync-tokens: checksum mismatch, the data hashes to ${actual}, not ${CHECKSUM}. The script changed on its way here, so nothing was written; pass the generated file verbatim.`
    );
  }
  const write = !RUN.dryRun;
  const report = {
    dryRun: RUN.dryRun,
    counts: {},
    created: [],
    updated: [],
    unchanged: 0,
    orphans: [],
    pruned: [],
    unbound: [],
  };

  // ── What the file holds ──
  const managedNames = new Set(PAYLOAD.collectionNames);
  const collections = new Map();
  for (const collection of await figma.variables.getLocalVariableCollectionsAsync()) {
    if (
      managedNames.has(collection.name) &&
      !collections.has(collection.name)
    ) {
      collections.set(collection.name, collection);
    }
  }
  const collectionName = new Map(
    [...collections].map(([name, collection]) => [collection.id, name])
  );
  const key = (collection, name) => `${collection}\n${name}`;
  const variables = new Map();
  const extras = [];
  for (const variable of await figma.variables.getLocalVariablesAsync()) {
    const owner = collectionName.get(variable.variableCollectionId);
    if (owner === undefined) continue;
    const at = key(owner, variable.name);
    if (variables.has(at)) extras.push(variable);
    else variables.set(at, variable);
  }

  // ── Orphans: in a collection this script syncs, but not in its payload ──
  const wanted = new Map();
  for (const plan of PAYLOAD.collections) {
    for (const variable of plan.variables) {
      wanted.set(key(plan.name, variable.name), variable.type);
    }
  }
  const synced = new Set(PAYLOAD.collections.map((plan) => plan.name));
  const orphans = [];
  for (const variable of [...variables.values(), ...extras]) {
    const owner = collectionName.get(variable.variableCollectionId);
    if (!synced.has(owner)) continue;
    const at = key(owner, variable.name);
    const type = wanted.get(at);
    const first = variables.get(at) === variable;
    // A second variable of one name is an orphan; so is one whose type
    // changed, since a type can't change in place.
    if (first && type === variable.resolvedType) continue;
    orphans.push({
      kind: "variable",
      collection: owner,
      name: variable.name,
      id: variable.id,
      node: variable,
      retyped: first ? type : undefined,
    });
  }
  const styleKinds = [
    ["text style", PAYLOAD.textStyles, await figma.getLocalTextStylesAsync()],
    [
      "effect style",
      PAYLOAD.effectStyles,
      await figma.getLocalEffectStylesAsync(),
    ],
  ];
  for (const [kind, plans, styles] of styleKinds) {
    if (!plans) continue;
    const names = new Set(plans.map((plan) => plan.name));
    const seen = new Set();
    for (const style of styles) {
      if (names.has(style.name) && !seen.has(style.name)) seen.add(style.name);
      else orphans.push({ kind, name: style.name, id: style.id, node: style });
    }
  }

  for (const plan of PAYLOAD.collections) {
    const collection = collections.get(plan.name);
    for (const mode of collection?.modes ?? []) {
      if (plan.modes.includes(mode.name)) continue;
      orphans.push({
        kind: "mode",
        name: `${plan.name}/${mode.name}`,
        id: mode.modeId,
        node: { remove: () => collection.removeMode(mode.modeId) },
      });
    }
  }

  // ── Prune: only the orphans named by ID, and only while they are orphans ──
  for (const id of RUN.prune) {
    const orphan = orphans.find((candidate) => candidate.id === id);
    if (!orphan) {
      throw new Error(
        `figma:sync-tokens: ${id} isn't an orphan of this sync, so nothing was pruned or written.`
      );
    }
    orphans.splice(orphans.indexOf(orphan), 1);
    report.pruned.push({ kind: orphan.kind, name: orphan.name, id });
    if (orphan.kind === "variable") {
      const at = key(orphan.collection, orphan.name);
      if (variables.get(at) === orphan.node) variables.delete(at);
    }
    if (write) orphan.node.remove();
  }
  for (const { name, id, node, retyped } of orphans) {
    if (retyped) {
      throw new Error(
        `figma:sync-tokens: ${name} is a ${node.resolvedType} in Figma but a ${retyped} in the payload. Prune ${id} to replace it; nothing was written.`
      );
    }
  }
  report.orphans = orphans.map(({ kind, name, id }) => ({ kind, name, id }));

  // ── Collections, modes and variables ──
  const created = new Set();
  for (const plan of PAYLOAD.collections) {
    let collection = collections.get(plan.name);
    if (!collection) {
      report.created.push(`${plan.name} (collection)`);
      if (write) {
        collection = figma.variables.createVariableCollection(plan.name);
        collection.renameMode(collection.modes[0].modeId, plan.modes[0]);
        for (const mode of plan.modes.slice(1)) collection.addMode(mode);
        collection.hiddenFromPublishing = plan.hidden;
        collections.set(plan.name, collection);
      }
    } else {
      const changes = [];
      for (const mode of plan.modes) {
        if (collection.modes.some((existing) => existing.name === mode))
          continue;
        changes.push(`mode ${mode}`);
        if (write) collection.addMode(mode);
      }
      if (collection.hiddenFromPublishing !== plan.hidden) {
        changes.push("hidden");
        if (write) collection.hiddenFromPublishing = plan.hidden;
      }
      if (changes.length) {
        report.updated.push(`${plan.name} (collection: ${changes.join(", ")})`);
      }
    }
    for (const variable of plan.variables) {
      const at = key(plan.name, variable.name);
      if (variables.has(at)) continue;
      report.created.push(variable.name);
      created.add(at);
      if (write) {
        variables.set(
          at,
          figma.variables.createVariable(
            variable.name,
            collection,
            variable.type
          )
        );
      }
    }
  }

  // Aliases and style bindings name a variable in any synced collection.
  const byName = new Map();
  for (const [at, variable] of variables) {
    const name = at.slice(at.indexOf("\n") + 1);
    byName.set(name, byName.has(name) ? null : variable);
  }
  const target = (name) => {
    const variable = byName.get(name);
    if (variable === null) {
      throw new Error(
        `figma:sync-tokens: more than one synced collection has ${name}; nothing was written.`
      );
    }
    return variable;
  };
  const value = (wantedValue) => {
    if (
      !wantedValue ||
      typeof wantedValue !== "object" ||
      !("alias" in wantedValue)
    ) {
      return wantedValue;
    }
    const variable = target(wantedValue.alias);
    // In a dry run an alias target may not exist yet.
    if (!variable) return undefined;
    return figma.variables.createVariableAlias(variable);
  };

  for (const plan of PAYLOAD.collections) {
    const collection = collections.get(plan.name);
    if (!collection) continue;
    const modeId = new Map(
      collection.modes.map((mode) => [mode.name, mode.modeId])
    );
    for (const wantedVariable of plan.variables) {
      const at = key(plan.name, wantedVariable.name);
      const variable = variables.get(at);
      if (!variable) continue;
      const changes = [];
      for (const mode of plan.modes) {
        const id = modeId.get(mode);
        const want = value(wantedVariable.valuesByMode[mode]);
        if (id && want !== undefined && same(variable.valuesByMode[id], want))
          continue;
        changes.push(`value:${mode}`);
        if (write) variable.setValueForMode(id, want);
      }
      if (
        wantedVariable.scopes &&
        !sameSet(variable.scopes, wantedVariable.scopes)
      ) {
        changes.push("scopes");
        if (write) variable.scopes = wantedVariable.scopes;
      }
      const syntax = wantedVariable.codeSyntax ?? {};
      if (!same(variable.codeSyntax, syntax)) {
        changes.push("codeSyntax");
        if (write) {
          for (const platform of Object.keys(variable.codeSyntax)) {
            if (!(platform in syntax))
              variable.removeVariableCodeSyntax(platform);
          }
          for (const [platform, text] of Object.entries(syntax)) {
            variable.setVariableCodeSyntax(platform, text);
          }
        }
      }
      if (created.has(at)) continue;
      if (changes.length)
        report.updated.push(`${wantedVariable.name} (${changes.join(", ")})`);
      else report.unchanged++;
    }
  }

  // ── Text styles ──
  const fontsLoaded = new Set();
  const loadFamily = async (family) => {
    if (fontsLoaded.has(family)) return;
    const fonts = (await figma.listAvailableFontsAsync()).filter(
      (font) => font.fontName.family === family
    );
    if (!fonts.length)
      throw new Error(
        `figma:sync-tokens: Figma has no ${family}; nothing was written.`
      );
    for (const font of fonts) await figma.loadFontAsync(font.fontName);
    fontsLoaded.add(family);
  };
  const boundTo = (bound, name) => {
    const variable = target(name);
    return Boolean(variable) && bound?.id === variable.id;
  };
  const staleText = (style, plan) =>
    Object.entries(plan.bind)
      .filter(([field, name]) => !boundTo(style.boundVariables?.[field], name))
      .map(([field]) => field);
  const staleEffects = (style, plan) => {
    const effects = style.effects;
    if (effects.length !== plan.effects.length) return ["effects"];
    return plan.effects.flatMap((effect, index) =>
      effects[index].type !== effect.type
        ? [`${index + 1}.type`]
        : Object.entries(effect.bind)
            .filter(
              ([field, name]) =>
                !boundTo(effects[index].boundVariables?.[field], name)
            )
            .map(([field]) => `${index + 1}.${field}`)
    );
  };

  const textStyles = await figma.getLocalTextStylesAsync();
  for (const plan of PAYLOAD.textStyles ?? []) {
    let style = textStyles.find((candidate) => candidate.name === plan.name);
    const stale = style ? staleText(style, plan) : [];
    if (!style) report.created.push(`${plan.name} (text style)`);
    else if (stale.length)
      report.updated.push(`${plan.name} (text style: ${stale.join(", ")})`);
    else {
      report.unchanged++;
      continue;
    }
    if (!write) continue;
    const family = Object.values(target(plan.bind.fontFamily).valuesByMode)[0];
    await loadFamily(family);
    if (style) await figma.loadFontAsync(style.fontName);
    else {
      style = figma.createTextStyle();
      style.name = plan.name;
      // A placeholder: the bound family and weight decide the face.
      style.fontName = { family, style: "Regular" };
    }
    for (const [field, name] of Object.entries(plan.bind)) {
      style.setBoundVariable(field, target(name));
    }
    for (const field of staleText(style, plan))
      report.unbound.push(`${plan.name}.${field}`);
  }

  // ── Effect styles: every field of every layer bound to a Light/Dark variable ──
  const effectStyles = await figma.getLocalEffectStylesAsync();
  for (const plan of PAYLOAD.effectStyles ?? []) {
    let style = effectStyles.find((candidate) => candidate.name === plan.name);
    const stale = style ? staleEffects(style, plan) : [];
    if (!style) report.created.push(`${plan.name} (effect style)`);
    else if (stale.length)
      report.updated.push(`${plan.name} (effect style: ${stale.join(", ")})`);
    else {
      report.unchanged++;
      continue;
    }
    if (!write) continue;
    if (!style) {
      style = figma.createEffectStyle();
      style.name = plan.name;
    }
    style.effects = plan.effects.map(({ type, bind }) => {
      let effect = {
        type,
        color: { r: 0, g: 0, b: 0, a: 0 },
        offset: { x: 0, y: 0 },
        radius: 0,
        spread: 0,
        visible: true,
        blendMode: "NORMAL",
      };
      for (const [field, name] of Object.entries(bind)) {
        effect = figma.variables.setBoundVariableForEffect(
          effect,
          field,
          target(name)
        );
      }
      return effect;
    });
    for (const field of staleEffects(style, plan))
      report.unbound.push(`${plan.name}.${field}`);
  }

  report.counts = {
    created: report.created.length,
    updated: report.updated.length,
    unchanged: report.unchanged,
    orphans: report.orphans.length,
    pruned: report.pruned.length,
    changes:
      report.created.length + report.updated.length + report.pruned.length,
  };
  return report;
}
