/* global figma, same, runSync */
// The fixed body of every figma:sync-components script (ADR 0007, ADR 0015),
// after sync-core.js. It owns the Components page: it finds each component
// set it made by name and by the mark it leaves on it, finds each variant
// and layer inside by name, and updates them in place to match the payload.
// Anything else on the page is an orphan, reported and kept; only the
// orphan IDs RUN.prune names are deleted. A dry run returns the diff and
// writes nothing.

// The mark on every set this script made, so a hand-built set of the same
// name (#15's Button) is an orphan, not something to update.
const MARK = ["dill", "generator", "figma:sync-components"];

const BIND_FIELDS = [
  "width",
  "height",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingBottom",
  "itemSpacing",
  "topLeftRadius",
  "topRightRadius",
  "bottomLeftRadius",
  "bottomRightRadius",
];
// With no class binding them, these are 0: a frame without a padding class
// has none. An unbound width or height is the layout's to decide.
const ZERO_UNBOUND = BIND_FIELDS.slice(2);

// Room around and between a set's variants on the canvas, in px. It isn't a
// design token: nothing in the code spaces variants apart.
const GRID = 24;

// figma/sync-components.ts appends the call.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function syncComponents(RUN, PAYLOAD, CHECKSUM) {
  return runSync(
    "figma:sync-components",
    RUN,
    PAYLOAD,
    CHECKSUM,
    componentsPass
  );
}

// One diff of PAYLOAD against the Components page, writing what differs
// unless dry.
async function componentsPass(RUN, PAYLOAD) {
  const write = !RUN.dryRun;
  const report = {
    dryRun: RUN.dryRun,
    counts: {},
    created: [],
    updated: [],
    unchanged: 0,
    orphans: [],
    pruned: [],
  };
  const fail = (message) => {
    throw new Error(`figma:sync-components: ${message}; nothing was written.`);
  };

  // ── The variables and styles figma:sync-tokens made ──
  const variables = new Map();
  for (const variable of await figma.variables.getLocalVariablesAsync()) {
    variables.set(
      variable.name,
      variables.has(variable.name) ? null : variable
    );
  }
  const variable = (name) => {
    const found = variables.get(name);
    if (found === null) fail(`more than one variable is named ${name}`);
    if (!found)
      fail(`the file has no ${name} variable; run figma:sync-tokens first`);
    return found;
  };
  const styleFinder = (kind, styles) => {
    const byName = new Map(styles.map((style) => [style.name, style]));
    return (name) =>
      byName.get(name) ??
      fail(`the file has no ${name} ${kind}; run figma:sync-tokens first`);
  };
  const textStyle = styleFinder(
    "text style",
    await figma.getLocalTextStylesAsync()
  );
  const effectStyle = styleFinder(
    "effect style",
    await figma.getLocalEffectStylesAsync()
  );

  // Every name the payload binds, checked up front, so a dry run on a file
  // without the tokens fails too, not only an apply.
  const check = (plan) => {
    const { bind = {}, fills = [], strokes = [] } = plan;
    for (const name of [...Object.values(bind), ...fills, ...strokes]) {
      variable(name);
    }
    if (plan.textStyle) textStyle(plan.textStyle);
    if (plan.effectStyle) effectStyle(plan.effectStyle);
    for (const child of plan.children ?? []) check(child);
  };
  for (const set of PAYLOAD.sets) set.variants.forEach(check);

  // ── The page, and what on it this script made ──
  let page = figma.root.children.find((node) => node.name === PAYLOAD.page);
  if (!page) {
    report.created.push(`${PAYLOAD.page} (page)`);
    if (write) {
      page = figma.createPage();
      page.name = PAYLOAD.page;
    }
  }
  if (page && figma.currentPage !== page) await figma.setCurrentPageAsync(page);

  const owned = new Set(PAYLOAD.setNames);
  const sets = new Map();
  const orphans = [];
  for (const node of page ? page.children : []) {
    const ours =
      node.type === "COMPONENT_SET" &&
      owned.has(node.name) &&
      !sets.has(node.name) &&
      node.getSharedPluginData(MARK[0], MARK[1]) === MARK[2];
    if (ours) sets.set(node.name, node);
    else orphans.push({ kind: node.type, name: node.name, id: node.id, node });
  }
  for (const plan of PAYLOAD.sets) {
    const set = sets.get(plan.name);
    if (!set) continue;
    const names = new Set(plan.variants.map(({ name }) => name));
    const seen = new Set();
    for (const child of set.children) {
      if (child.type === "COMPONENT" && names.has(child.name)) {
        if (!seen.has(child.name)) {
          seen.add(child.name);
          continue;
        }
      }
      orphans.push({
        kind: "variant",
        name: `${plan.name}/${child.name}`,
        id: child.id,
        node: child,
      });
    }
  }

  // ── Prune: only the orphans named by ID, and only while they are orphans ──
  for (const id of RUN.prune) {
    const orphan = orphans.find((candidate) => candidate.id === id);
    if (!orphan)
      fail(`${id} isn't an orphan of this sync, so nothing was pruned`);
    orphans.splice(orphans.indexOf(orphan), 1);
    report.pruned.push({ kind: orphan.kind, name: orphan.name, id });
    if (write) orphan.node.remove();
  }
  report.orphans = orphans.map(({ kind, name, id }) => ({ kind, name, id }));

  // ── Layers ──
  const paintsMatch = (current, wanted) =>
    Array.isArray(current) &&
    current.length === wanted.length &&
    wanted.every(
      (want, i) =>
        current[i].type === "SOLID" &&
        current[i].visible !== false &&
        same(current[i].opacity ?? 1, 1) &&
        current[i].boundVariables?.color?.id === want.id
    );
  const paints = (wanted) =>
    wanted.map((want) =>
      figma.variables.setBoundVariableForPaint(
        { type: "SOLID", color: { r: 0, g: 0, b: 0 } },
        "color",
        want
      )
    );

  let fonts;
  const loaded = new Set();
  const load = async (font) => {
    const key = `${font.family}\n${font.style}`;
    if (loaded.has(key)) return;
    await figma.loadFontAsync(font);
    loaded.add(key);
  };
  // The style's bound weight picks the face, so every face of its family loads.
  const loadFonts = async (node, style) => {
    fonts ??= await figma.listAvailableFontsAsync();
    for (const { fontName } of fonts) {
      if (fontName.family === style.fontName.family) await load(fontName);
    }
    if (node.fontName !== figma.mixed) await load(node.fontName);
  };

  async function syncText(node, raw, path) {
    const plan = { ...PAYLOAD.defaults.text, ...raw };
    const style = textStyle(plan.textStyle);
    const fills = plan.fills.map(variable);
    const stale = [];
    if (node.textStyleId !== style.id) stale.push("textStyle");
    if (node.characters !== plan.characters) stale.push("characters");
    if (node.textAutoResize !== plan.textAutoResize)
      stale.push("textAutoResize");
    if (!paintsMatch(node.fills, fills)) stale.push("fills");
    if (write && stale.length) {
      await loadFonts(node, style);
      await node.setTextStyleIdAsync(style.id);
      node.characters = plan.characters;
      node.textAutoResize = plan.textAutoResize;
      node.fills = paints(fills);
    }
    return stale.map((field) => path + field);
  }

  // Diffs a layer against its plan, writing what differs unless dry, and
  // returns what differed. A placed layer goes on `places`, to be placed
  // once its parent's size is final.
  async function syncNode(node, raw, path, places) {
    if (raw.type === "TEXT") return syncText(node, raw, path);
    const plan = { ...PAYLOAD.defaults.frame, ...raw };
    const changes = [];
    const set = (field, want) => {
      if (same(node[field], want)) return;
      changes.push(path + field);
      if (write) node[field] = want;
    };

    set("layoutMode", plan.layoutMode);
    set("layoutPositioning", plan.layoutPositioning);
    set("clipsContent", plan.clipsContent);
    set("strokeWeight", plan.strokeWeight);
    for (const field of BIND_FIELDS) {
      const bound = node.boundVariables?.[field];
      if (plan.bind[field]) {
        const want = variable(plan.bind[field]);
        if (bound?.id === want.id) continue;
        changes.push(path + field);
        if (write) node.setBoundVariable(field, want);
        continue;
      }
      const zero = ZERO_UNBOUND.includes(field);
      if (!bound && (!zero || same(node[field], 0))) continue;
      changes.push(path + field);
      if (!write) continue;
      if (bound) node.setBoundVariable(field, null);
      if (zero) node[field] = 0;
    }
    // After the bindings: binding a length can fix its axis.
    if (plan.layoutMode !== "NONE") {
      set("primaryAxisSizingMode", plan.primaryAxisSizingMode);
      set("counterAxisSizingMode", plan.counterAxisSizingMode);
      set("primaryAxisAlignItems", plan.primaryAxisAlignItems);
      set("counterAxisAlignItems", plan.counterAxisAlignItems);
    }

    for (const field of ["fills", "strokes"]) {
      const wanted = plan[field].map(variable);
      if (paintsMatch(node[field], wanted)) continue;
      changes.push(path + field);
      if (write) node[field] = paints(wanted);
    }
    const effect = plan.effectStyle ? effectStyle(plan.effectStyle).id : "";
    if (node.effectStyleId !== effect || (!effect && node.effects.length)) {
      changes.push(path + "effectStyle");
      if (write) {
        if (effect) await node.setEffectStyleIdAsync(effect);
        else node.effects = [];
      }
    }

    // Before the children, so places run parent first.
    if (plan.place) places.push({ node, plan, path });
    const kept = [];
    for (const childPlan of plan.children) {
      const childPath = `${path}${childPlan.name}.`;
      let child = node.children.find(
        (candidate) =>
          candidate.name === childPlan.name &&
          candidate.type === childPlan.type &&
          !kept.includes(candidate)
      );
      if (child) {
        changes.push(...(await syncNode(child, childPlan, childPath, places)));
      } else {
        changes.push(`${path}${childPlan.name} (new)`);
        if (!write) continue;
        child =
          childPlan.type === "TEXT" ? figma.createText() : figma.createFrame();
        child.name = childPlan.name;
        node.appendChild(child);
        await syncNode(child, childPlan, childPath, places);
      }
      kept.push(child);
    }
    for (const child of [...node.children]) {
      if (kept.includes(child)) continue;
      changes.push(`${path}${child.name} (removed)`);
      if (write) child.remove();
    }
    const order = node.children.filter((child) => kept.includes(child));
    if (!order.every((child, i) => child === kept[i])) {
      changes.push(path + "order");
      if (write) kept.forEach((child, i) => node.insertChild(i, child));
    }
    return changes;
  }

  const along = (edge, parentLength, ownLength) => {
    const length = edge.size === null ? ownLength : edge.size * parentLength;
    const start =
      edge.end === null
        ? edge.start * parentLength
        : parentLength - edge.end - length;
    return [start, length];
  };

  async function syncVariant(component, plan) {
    const places = [];
    const changes = await syncNode(component, plan, "", places);
    // Top-down, so each parent is placed before its children read its size.
    for (const { node, plan: layer, path } of places) {
      const { x: across, y: down } = layer.place;
      const [x, width] = along(across, node.parent.width, node.width);
      const [y, height] = along(down, node.parent.height, node.height);
      const constraints = {
        horizontal: across.constraint,
        vertical: down.constraint,
      };
      if (
        same(
          [node.x, node.y, node.width, node.height],
          [x, y, width, height]
        ) &&
        same(node.constraints, constraints)
      ) {
        continue;
      }
      changes.push(path + "place");
      if (!write) continue;
      if (!same([node.width, node.height], [width, height])) {
        node.resize(width, height);
        // resize() can drop a bound length; bind it again.
        for (const field of ["width", "height"]) {
          const name = layer.bind?.[field];
          if (name) node.setBoundVariable(field, variable(name));
        }
      }
      node.x = x;
      node.y = y;
      node.constraints = constraints;
    }
    return changes;
  }

  // ── Component sets ──
  for (const plan of PAYLOAD.sets) {
    let set = sets.get(plan.name);
    const created = !set;
    if (created) {
      report.created.push(
        `${plan.name} (component set)`,
        ...plan.variants.map(({ name }) => `${plan.name}/${name}`)
      );
      if (!write) continue;
      // A new set goes to the right of everything already on the page.
      const right = Math.max(
        0,
        ...page.children.map((node) => node.x + node.width + 80)
      );
      const components = [];
      for (const variant of plan.variants) {
        const component = figma.createComponent();
        component.name = variant.name;
        page.appendChild(component);
        await syncVariant(component, variant);
        components.push(component);
      }
      set = figma.combineAsVariants(components, page);
      set.name = plan.name;
      set.setSharedPluginData(MARK[0], MARK[1], MARK[2]);
      set.x = right;
      set.y = 0;
    } else {
      for (const variant of plan.variants) {
        const name = `${plan.name}/${variant.name}`;
        const component = set.children.find(
          (child) => child.type === "COMPONENT" && child.name === variant.name
        );
        if (!component) {
          report.created.push(name);
          if (!write) continue;
          const added = figma.createComponent();
          added.name = variant.name;
          set.appendChild(added);
          await syncVariant(added, variant);
          continue;
        }
        const changes = await syncVariant(component, variant);
        if (changes.length)
          report.updated.push(`${name} (${changes.join(", ")})`);
        else report.unchanged++;
      }
    }

    // The set itself: its description, and its variants in a grid, one row
    // per combination of the other axes.
    const changes = [];
    if (set.description !== plan.description) {
      changes.push("description");
      if (write) set.description = plan.description;
    }
    const variants = plan.variants.map(({ name }) =>
      set.children.find(
        (child) => child.type === "COMPONENT" && child.name === name
      )
    );
    if (variants.every(Boolean)) {
      const columns = Math.min(plan.columns, variants.length);
      const rows = Math.ceil(variants.length / columns);
      const cell = {
        width: Math.max(...variants.map((variant) => variant.width)),
        height: Math.max(...variants.map((variant) => variant.height)),
      };
      const at = variants.map((_, i) => [
        GRID + (i % columns) * (cell.width + GRID),
        GRID + Math.floor(i / columns) * (cell.height + GRID),
      ]);
      const size = [
        GRID + columns * (cell.width + GRID),
        GRID + rows * (cell.height + GRID),
      ];
      const order = set.children.filter((child) => variants.includes(child));
      const laidOut =
        variants.every((variant, i) => same([variant.x, variant.y], at[i])) &&
        same([set.width, set.height], size) &&
        order.every((child, i) => child === variants[i]);
      if (!laidOut) {
        changes.push("layout");
        if (write) {
          variants.forEach((variant, i) => {
            set.insertChild(i, variant);
            variant.x = at[i][0];
            variant.y = at[i][1];
          });
          set.resizeWithoutConstraints(size[0], size[1]);
        }
      }
    }
    if (created) continue;
    if (changes.length)
      report.updated.push(
        `${plan.name} (component set: ${changes.join(", ")})`
      );
    else report.unchanged++;
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
