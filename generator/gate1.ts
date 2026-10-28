// Gate 1 (ADR 0004, ADR 0011): the UI spec checked against the registry and
// the fixtures before any code exists. Each failure names the node id it
// found the problem on, `states.<name>` or `actions.<name>` for a declared
// state or action, or `(ui spec)` for the spec as a whole. Every check runs,
// so one attempt reports everything it got wrong (ADR 0010).

import { z } from "zod";
// The screen state every screen has besides the declared ones; a node's
// `when` and an action's `to` may name it.
import { defaultState } from "../src/components/Screen/default-state.ts";
import { screenVariants } from "../src/fixtures/fixtures.ts";
import { type RegistryEntry, specProps } from "../src/registry/entry.ts";
import type { Failure } from "./failure.ts";
import { type UiNode, type UiSpec, wireSchema } from "./ui-spec.ts";
import { visibility } from "./visibility.ts";

export type Gate1Fixtures = {
  // Each fixture variant's data by name; the default state renders the one
  // named "default".
  variants: Readonly<Record<string, unknown>>;
  // The mock async operations an action may run.
  operations: readonly string[];
};

export type Gate1Context = {
  entries: readonly RegistryEntry[];
  // The screen brief's audience.
  audience: string;
  // The screen brief's slug, which names the fixture variants it may use.
  slug: string;
  fixtures: Gate1Fixtures;
};

const whole = "(ui spec)";
// A DataTable's slots whose template node renders once per row, where `row.*`
// paths resolve (ADR 0004, ADR 0011). The code step's instructions name the
// same list, as the slots it passes as a function of the row.
export const rowSlots: readonly string[] = ["cell", "detail"];

export function gate1(raw: unknown, context: Gate1Context): Failure[] {
  let input = raw;
  if (typeof raw === "string") {
    try {
      input = JSON.parse(raw);
    } catch (error) {
      return [
        fail("wire-shape", whole, `Not JSON: ${(error as Error).message}`),
      ];
    }
  }
  // Components are checked by name below, so an unknown one is named on its
  // node rather than failing the shape.
  const parsed = wireSchema().safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) =>
      fail("wire-shape", issue.path.join(".") || whole, issue.message)
    );
  }
  return checks(parsed.data, context);
}

function checks(
  spec: UiSpec,
  { entries, audience, slug, fixtures: allFixtures }: Gate1Context
) {
  const failures: Failure[] = [];
  // Bindings resolve only in the screen's own variants; a state that names
  // any other fails state-fixture.
  const fixtures = {
    ...allFixtures,
    variants: screenVariants(allFixtures.variants, slug),
  };
  // An internal entry is one a UI spec never names, so it reads as
  // unregistered here, even on a spec that didn't come through the wire
  // schema.
  const entryOf = new Map(
    entries
      .filter((entry) => !entry.internal)
      .map((entry) => [entry.name, entry])
  );
  const byId = new Map<string, UiNode>();

  // Ids are unique.
  for (const node of spec.nodes) {
    if (byId.has(node.id)) {
      failures.push(
        fail("unique-ids", node.id, `Another node already has id "${node.id}".`)
      );
    } else {
      byId.set(node.id, node);
    }
  }

  // One root, and it is a Screen; no Screen anywhere else.
  const roots = spec.nodes.filter((node) => node.parent === null);
  const [root] = roots;
  if (root === undefined) {
    failures.push(
      fail(
        "one-root",
        whole,
        "No node has a null parent; the Screen is the root."
      )
    );
  }
  for (const extra of roots.slice(1)) {
    failures.push(
      fail(
        "one-root",
        extra.id,
        `A second root; only the Screen "${root!.id}" has a null parent.`
      )
    );
  }
  if (root !== undefined && root.component !== "Screen") {
    failures.push(
      fail(
        "screen-root",
        root.id,
        `The root is a ${root.component}, not a Screen.`
      )
    );
  }
  if (root?.slot != null) {
    failures.push(fail("slot-exists", root.id, "The root sits in no slot."));
  }
  for (const node of spec.nodes) {
    if (node.component === "Screen" && node.parent !== null) {
      failures.push(
        fail(
          "screen-root",
          node.id,
          "A Screen is only ever the root, never nested."
        )
      );
    }
  }

  // Parents exist, and following them never loops.
  for (const node of spec.nodes) {
    if (node.parent !== null && !byId.has(node.parent)) {
      failures.push(
        fail(
          "parent-exists",
          node.id,
          `Its parent "${node.parent}" doesn't exist.`
        )
      );
    }
  }
  for (const node of byId.values()) {
    if (inCycle(node, byId)) {
      failures.push(
        fail(
          "no-cycles",
          node.id,
          "Following its parents leads back to itself."
        )
      );
    }
  }

  const screen = screenModel(spec, byId, fixtures);
  for (const node of spec.nodes) {
    const entry = entryOf.get(node.component);
    if (entry === undefined) {
      failures.push(
        fail(
          "registered-component",
          node.id,
          `"${node.component}" isn't a registered component.`
        )
      );
      continue;
    }
    const parent = parentOf(node, byId);
    const parentEntry = parent && entryOf.get(parent.component);
    if (parentEntry) failures.push(...slotChecks(node, parentEntry));
    if (parent?.component === "Stack") {
      failures.push(...stackedAllowChecks(node, parent, byId, entryOf));
    }
    failures.push(...propChecks(node, entry, screen));
  }
  failures.push(...stateChecks(spec, byId, fixtures, allFixtures.variants));
  failures.push(...headingChecks(screen));
  failures.push(...motionChecks(spec, byId, screen));
  failures.push(...footerChecks(spec, byId));
  failures.push(...nestingChecks(spec, byId, entryOf));

  // The audience is the screen brief's, on the spec and on its Screen.
  if (spec.audience !== audience) {
    failures.push(
      fail(
        "audience-match",
        whole,
        `The audience is "${spec.audience}"; the screen brief's is "${audience}".`
      )
    );
  }
  const screenAudience =
    root?.component === "Screen" && propValue(root, "audience");
  if (
    screenAudience &&
    screenAudience.ok &&
    screenAudience.value !== audience
  ) {
    failures.push(
      fail(
        "audience-match",
        root.id,
        `The Screen's audience is ${JSON.stringify(screenAudience.value)}; the screen brief's is "${audience}".`
      )
    );
  }

  return failures;
}

// States and actions are consistent: each is declared once, each state
// renders one of the screen's own fixture variants, and every state or
// action a node or an action names is declared. `fixtures` holds only the
// screen's own variants; `allVariants` tells another screen's from none at
// all.
function stateChecks(
  spec: UiSpec,
  byId: Map<string, UiNode>,
  fixtures: Gate1Fixtures,
  allVariants: Gate1Fixtures["variants"]
): Failure[] {
  const variantList = Object.keys(fixtures.variants).join(", ");
  const failures: Failure[] = [];
  const states = new Set([defaultState]);
  for (const { name, fixture } of spec.states) {
    const where = `states.${name}`;
    if (states.has(name)) {
      failures.push(
        fail(
          "state-unique",
          where,
          name === defaultState
            ? `Every screen has a "${defaultState}" state; it isn't declared.`
            : `"${name}" is declared twice.`
        )
      );
      continue;
    }
    states.add(name);
    if (!Object.hasOwn(fixtures.variants, fixture)) {
      const whose = Object.hasOwn(allVariants, fixture)
        ? "is another screen's"
        : "doesn't exist";
      failures.push(
        fail(
          "state-fixture",
          where,
          `Its fixture variant "${fixture}" ${whose}; the variants are ${variantList}.`
        )
      );
    }
  }
  const stateList = [...states].join(", ");

  for (const node of spec.nodes) {
    for (const state of node.when) {
      if (!states.has(state)) {
        failures.push(
          fail(
            "when-declared",
            node.id,
            `Its when names "${state}", which isn't a screen state; they are ${stateList}.`
          )
        );
      }
    }
  }

  const actions = new Set<string>();
  for (const { name, operation, pending, to } of spec.actions) {
    const where = `actions.${name}`;
    if (actions.has(name)) {
      failures.push(
        fail("action-unique", where, `"${name}" is declared twice.`)
      );
      continue;
    }
    actions.add(name);
    if (!fixtures.operations.includes(operation)) {
      failures.push(
        fail(
          "action-operation",
          where,
          `"${operation}" isn't a fixtures operation; they are ${fixtures.operations.join(", ")}.`
        )
      );
    }
    for (const outcome of ["success", "failure"] as const) {
      if (!states.has(to[outcome])) {
        failures.push(
          fail(
            "action-to",
            where,
            `Its to.${outcome} "${to[outcome]}" isn't a screen state; they are ${stateList}.`
          )
        );
      }
    }
    const pendingNode = byId.get(pending);
    if (pendingNode?.action !== name) {
      failures.push(
        fail(
          "action-pending",
          where,
          pendingNode === undefined
            ? `Its pending node "${pending}" doesn't exist.`
            : `Its pending node "${pending}" doesn't run it; the node that shows pending is the one whose action is "${name}".`
        )
      );
    }
  }

  for (const node of spec.nodes) {
    if (node.action !== null && !actions.has(node.action)) {
      failures.push(
        fail(
          "action-declared",
          node.id,
          `It runs "${node.action}", which isn't a declared action.`
        )
      );
    }
  }
  return failures;
}

// In each screen state, the headings it shows, in render order, never skip
// a level, and if there are any, exactly one is level 1. A screen with no
// headings passes.
function headingChecks(screen: ScreenModel): Failure[] {
  const failures = new FailureSet();
  for (const state of screen.states) {
    const headings = screen.inOrder.flatMap((node) => {
      if (node.component !== "Heading") return [];
      if (!screen.visibleIn(node).includes(state)) return [];
      const level = propValue(node, "level");
      return level?.ok && typeof level.value === "number"
        ? [{ node, level: level.value }]
        : [];
    });
    const [first] = headings;
    if (first === undefined) continue;
    const ones = headings.filter(({ level }) => level === 1);
    if (ones.length === 0) {
      failures.add(
        fail(
          "heading-one",
          first.node.id,
          `State "${state}" shows headings but no level 1; this, its first, is level ${first.level}.`
        )
      );
    }
    for (const { node } of ones.slice(1)) {
      failures.add(
        fail(
          "heading-one",
          node.id,
          `A second level 1 in state "${state}", after "${ones[0]!.node.id}".`
        )
      );
    }
    headings.forEach(({ node, level }, i) => {
      const before = headings[i - 1];
      if (before && level > before.level + 1) {
        failures.add(
          fail(
            "heading-skip",
            node.id,
            `Level ${level} follows level ${before.level} ("${before.node.id}") in state "${state}", skipping a level.`
          )
        );
      }
    });
  }
  return failures.list;
}

// The structure the signature transitions ride on (ADR 0011, ADR 0013): a
// Toast is an action's result, so each state shows at most one, and only in
// states an action enters, never the default state; and a Sheet is a
// DataTable row's detail.
function motionChecks(
  spec: UiSpec,
  byId: Map<string, UiNode>,
  screen: ScreenModel
): Failure[] {
  const failures = new FailureSet();
  for (const state of screen.states) {
    // In list order, so the one named is the one written later.
    const shown = spec.nodes.filter(
      (node) =>
        node.component === "Toast" && screen.visibleIn(node).includes(state)
    );
    for (const extra of shown.slice(1)) {
      failures.add(
        fail(
          "one-toast",
          extra.id,
          `A second Toast in state "${state}", after "${shown[0]!.id}"; a state shows at most one.`
        )
      );
    }
  }

  const entered = new Set(
    spec.actions.flatMap(({ to }) => [to.success, to.failure])
  );
  for (const node of spec.nodes) {
    if (node.component === "Toast") {
      const stray = screen
        .visibleIn(node)
        .filter((state) => state === defaultState || !entered.has(state));
      if (stray.length > 0) {
        failures.add(
          fail(
            "toast-state",
            node.id,
            `It shows in ${stray.map((state) => `"${state}"`).join(", ")}; a Toast shows only in a state an action's to enters, never the default state.`
          )
        );
      }
    }
    if (node.component === "Sheet") {
      const parent = parentOf(node, byId);
      if (parent?.component !== "DataTable" || node.slot !== "detail") {
        failures.add(
          fail(
            "sheet-in-detail",
            node.id,
            "A Sheet sits only in a DataTable's detail slot."
          )
        );
      }
    }
  }
  return failures.list;
}

// A DataTable's actions footer (ADR 0013): each Button in it runs an action,
// since it acts on the Selection; and a table with actions gives
// selectionText, the selected count's three forms, whose `other` form holds
// the `{count}` the library replaces with the number of ticked rows. That
// the slot takes only Buttons is its registry allow-list's.
const countMark = "{count}";

function footerChecks(spec: UiSpec, byId: Map<string, UiNode>): Failure[] {
  const failures: Failure[] = [];
  const example =
    '"No invoices selected", "1 invoice selected" and "{count} invoices selected"';
  for (const table of spec.nodes) {
    if (table.component !== "DataTable") continue;
    const actions = spec.nodes.filter(
      (node) => node.slot === "actions" && parentOf(node, byId) === table
    );
    for (const button of actions) {
      if (button.component === "Button" && button.action === null) {
        failures.push(
          fail(
            "table-action-button",
            button.id,
            `It sits in the DataTable "${table.id}"'s actions footer but runs no action; give it the action it runs on the selected rows.`
          )
        );
      }
    }
    if (actions.length === 0) continue;
    const text = propValue(table, "selectionText");
    if (text === undefined) {
      failures.push(
        fail(
          "selection-text",
          table.id,
          `It has actions, so it gives selectionText: { "none", "one", "other" }, the footer's selected count with no row, one row and more rows ticked, such as ${example}.`
        )
      );
      continue;
    }
    // A selectionText that doesn't parse is props-parse's to report.
    const other: unknown =
      text.ok && typeof text.value === "object" && text.value !== null
        ? (text.value as Record<string, unknown>).other
        : undefined;
    if (typeof other === "string" && !other.includes(countMark)) {
      failures.push(
        fail(
          "selection-count",
          table.id,
          `Its selectionText's other form, ${JSON.stringify(other)}, has no ${countMark}; write it where the number goes, such as "{count} invoices selected", and the library fills it in.`
        )
      );
    }
  }
  return failures;
}

// No flat surface (an entry whose `surface` is flat: Card, DataTable,
// EmptyState) sits beneath another, through any slot and any depth of layout
// nodes (`nested-cards` in lint/taste/RULES.md): a surface inside a surface
// is the SaaS-card kit the brief bans. Only the nearest surface above counts,
// and it is the one named: a raised or overlay one (a Toast, a Sheet) floats
// as its own, so what's in it isn't inside the flat surface beneath.
function nestingChecks(
  spec: UiSpec,
  byId: Map<string, UiNode>,
  entryOf: Map<string, RegistryEntry>
): Failure[] {
  const failures: Failure[] = [];
  const surfaceOf = (node: UiNode) => entryOf.get(node.component)?.surface;
  for (const node of spec.nodes) {
    if (surfaceOf(node) !== "flat") continue;
    const above = ancestors(node, byId).find((at) => surfaceOf(at));
    if (above && surfaceOf(above) === "flat") {
      failures.push(
        fail(
          "nested-cards",
          node.id,
          `The ${node.component} "${node.id}" sits inside the ${above.component} "${above.id}"; a surface never goes inside a surface: put it beside the ${above.component}, or use a Stack for layout.`
        )
      );
    }
  }
  return failures;
}

// Failures found once per screen state, each reported once: for the first
// state that shows it.
class FailureSet {
  readonly list: Failure[] = [];
  private readonly seen = new Set<string>();
  add(failure: Failure) {
    const key = `${failure.rule}\u0000${failure.location}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.list.push(failure);
  }
}

function slotChecks(node: UiNode, parent: RegistryEntry): Failure[] {
  const slots = parent.slots ?? {};
  const names = Object.keys(slots);
  if (names.length === 0) {
    return [
      fail(
        "slot-exists",
        node.id,
        `${parent.name} has no slots, so it takes no children.`
      ),
    ];
  }
  const list = names.join(", ");
  if (node.slot === null) {
    return [
      fail(
        "slot-exists",
        node.id,
        `It names no slot; ${parent.name}'s slots are ${list}.`
      ),
    ];
  }
  const slot = Object.hasOwn(slots, node.slot) ? slots[node.slot] : undefined;
  if (slot === undefined) {
    return [
      fail(
        "slot-exists",
        node.id,
        `${parent.name} has no slot "${node.slot}"; its slots are ${list}.`
      ),
    ];
  }
  if (slot.allow && !slot.allow.includes(node.component)) {
    return [
      fail(
        "slot-allow",
        node.id,
        `${parent.name}'s ${node.slot} slot takes only ${slot.allow.join(", ")}, not ${node.component}.`
      ),
    ];
  }
  return [];
}

// A Stack is layout, not content, so a slot's allow-list holds through any
// chain of Stacks below it: a node whose parent is a Stack is checked against
// the nearest enclosing slot, above the Stacks, that has an allow-list. The
// walk stops at the first component that isn't a Stack, whose own slots
// apply their own lists.
function stackedAllowChecks(
  node: UiNode,
  parent: UiNode,
  byId: Map<string, UiNode>,
  entryOf: Map<string, RegistryEntry>
): Failure[] {
  // Each step reads the slot `child` sits in on `owner`; the first step's is
  // the node's own slot, which slotChecks has already held it to.
  let child = node;
  for (const owner of ancestors(node, byId)) {
    const entry = entryOf.get(owner.component);
    if (!entry || child.slot === null) break;
    const slots = entry.slots ?? {};
    const slot = Object.hasOwn(slots, child.slot)
      ? slots[child.slot]
      : undefined;
    if (slot?.allow) {
      return child === node || slot.allow.includes(node.component)
        ? []
        : [
            fail(
              "slot-allow",
              node.id,
              `${entry.name}'s ${child.slot} slot takes only ${slot.allow.join(", ")}, not ${node.component} (inside the Stack "${parent.id}").`
            ),
          ];
    }
    if (owner.component !== "Stack") break;
    child = owner;
  }
  return [];
}

function propChecks(
  node: UiNode,
  entry: RegistryEntry,
  screen: ScreenModel
): Failure[] {
  const failures: Failure[] = [];
  const props: Record<string, unknown> = {};
  let unparsed = false;
  for (const { name, value } of node.props) {
    if (Object.hasOwn(props, name)) {
      failures.push(fail("props-parse", node.id, `"${name}" is given twice.`));
      continue;
    }
    try {
      props[name] = JSON.parse(value);
    } catch {
      unparsed = true;
      failures.push(
        fail("props-parse", node.id, `"${name}" isn't a JSON value: ${value}`)
      );
    }
  }
  // A value that isn't JSON would also read as missing; say it once.
  if (unparsed) return failures;

  // A bound prop of the entry's is checked against the data it resolves to,
  // below; every other prop, a bound one the entry doesn't have included,
  // parses here as written. A code-only prop is one the node doesn't have:
  // the code step sets it.
  const shape = specProps(entry).shape;
  const bound = Object.entries(props).flatMap(([name, value]) => {
    const path = bindingPath(value);
    return path !== undefined && Object.hasOwn(shape, name)
      ? [{ name, path }]
      : [];
  });
  const boundNames = new Set(bound.map(({ name }) => name));
  const unbound = <T>(record: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(record).filter(([name]) => !boundNames.has(name))
    );
  const result = z.strictObject(unbound(shape)).safeParse(unbound(props));
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      failures.push(
        fail(
          "props-parse",
          node.id,
          `${entry.name} ${path ? `"${path}": ` : ""}${issue.message}`
        )
      );
    }
  }

  const table = screen.rowTable(node);
  for (const { name, path } of bound) {
    const binds = `"${name}" binds "${path}"`;
    if (isRowPath(path) && table === undefined) {
      failures.push(
        fail(
          "binding-row-scope",
          node.id,
          `${binds}, but row paths resolve only inside a DataTable's ${rowSlots.join(" or ")} slot.`
        )
      );
      continue;
    }
    for (const where of screen.dataFor(node, table)) {
      const resolved = resolvePath(path, where);
      if (!resolved.ok) {
        failures.push(
          fail(
            "binding-resolves",
            node.id,
            `${binds}, which doesn't resolve ${describe(where)}.`
          )
        );
        break;
      }
      const fit = shape[name]!.safeParse(resolved.value);
      if (!fit.success) {
        failures.push(
          fail(
            "binding-type",
            node.id,
            `${binds} to ${JSON.stringify(resolved.value)} ${describe(where)}, which ${entry.name}'s "${name}" doesn't take: ${fit.error.issues[0]!.message}`
          )
        );
        break;
      }
    }
  }
  return failures;
}

// The data a node renders: one fixture variant per screen state it shows in,
// and inside a DataTable's row slots, each row of each.
type DataPoint = {
  state: string;
  variant: string;
  data: unknown;
  row?: { index: number; value: unknown };
};

type ScreenModel = {
  // The default state, then each declared one.
  states: string[];
  // The nodes reachable from the root, in render order: depth first, and
  // siblings in list order.
  inOrder: UiNode[];
  // The screen states a node shows in: its own `when`, within its parent's.
  visibleIn: (node: UiNode) => string[];
  // The DataTable whose rows a node's row paths read, if it sits in one's
  // row slots.
  rowTable: (node: UiNode) => UiNode | undefined;
  dataFor: (node: UiNode, table: UiNode | undefined) => DataPoint[];
};

function screenModel(
  spec: UiSpec,
  byId: Map<string, UiNode>,
  fixtures: Gate1Fixtures
): ScreenModel {
  const variantOf = new Map([[defaultState, defaultState]]);
  for (const { name, fixture } of spec.states) {
    if (!variantOf.has(name)) variantOf.set(name, fixture);
  }
  const { states, parentOf, visibleIn } = visibility(spec, byId);

  const rowTable = (node: UiNode) => {
    const seen = new Set<UiNode>();
    let child = node;
    let parent = parentOf(child);
    // Up to the first edge into a row slot, then up to the DataTable that
    // owns it or holds its owner.
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      if (child.slot !== null && rowSlots.includes(child.slot)) {
        for (let at: UiNode | undefined = parent; at; at = parentOf(at)) {
          if (at.component === "DataTable") return at;
          if (seen.has(at) && at !== parent) break;
          seen.add(at);
        }
        return undefined;
      }
      child = parent;
      parent = parentOf(child);
    }
    return undefined;
  };

  const dataFor = (node: UiNode, table: UiNode | undefined) => {
    const points: DataPoint[] = [];
    for (const state of visibleIn(node)) {
      const variant = variantOf.get(state)!;
      if (!Object.hasOwn(fixtures.variants, variant)) continue;
      const point = { state, variant, data: fixtures.variants[variant] };
      if (table === undefined) {
        points.push(point);
        continue;
      }
      const rowsProp = propValue(table, "rows");
      const rowsPath = rowsProp?.ok ? bindingPath(rowsProp.value) : undefined;
      const rows =
        rowsPath === undefined || isRowPath(rowsPath)
          ? undefined
          : resolvePath(rowsPath, point);
      if (rows?.ok && Array.isArray(rows.value)) {
        rows.value.forEach((value: unknown, index) =>
          points.push({ ...point, row: { index, value } })
        );
      }
    }
    return points;
  };

  const children = new Map<string, UiNode[]>();
  for (const node of byId.values()) {
    if (node.parent === null) continue;
    const siblings = children.get(node.parent) ?? [];
    siblings.push(node);
    children.set(node.parent, siblings);
  }
  const ordered = new Set<UiNode>();
  const visit = (node: UiNode) => {
    if (ordered.has(node)) return;
    ordered.add(node);
    for (const child of children.get(node.id) ?? []) visit(child);
  };
  const root = spec.nodes.find((node) => node.parent === null);
  if (root) visit(root);

  return { states, inOrder: [...ordered], visibleIn, rowTable, dataFor };
}

// A prop value `{ "bind": "<path>" }` reads its value from the fixtures.
function bindingPath(value: unknown) {
  if (typeof value !== "object" || value === null) return undefined;
  const keys = Object.keys(value);
  const path = (value as { bind?: unknown }).bind;
  return keys.length === 1 && typeof path === "string" ? path : undefined;
}

function isRowPath(path: string) {
  return path === "row" || path.startsWith("row.");
}

function resolvePath(path: string, { data, row }: DataPoint) {
  const [first, ...rest] = path.split(".");
  let current: unknown = data;
  let segments = [first!, ...rest];
  if (isRowPath(path)) {
    current = row?.value;
    segments = rest;
  }
  for (const segment of segments) {
    if (
      typeof current !== "object" ||
      current === null ||
      !Object.hasOwn(current, segment)
    ) {
      return { ok: false as const };
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current === undefined
    ? { ok: false as const }
    : { ok: true as const, value: current };
}

function describe({ state, variant, row }: DataPoint) {
  const where = `in state "${state}" (fixture variant "${variant}")`;
  return row ? `${where}, on row ${row.index + 1}` : where;
}

function propValue(node: UiNode, name: string) {
  const prop = node.props.find((candidate) => candidate.name === name);
  if (prop === undefined) return undefined;
  try {
    return { ok: true as const, value: JSON.parse(prop.value) as unknown };
  } catch {
    return { ok: false as const };
  }
}

function parentOf(node: UiNode, byId: Map<string, UiNode>) {
  return node.parent === null ? undefined : byId.get(node.parent);
}

// The nodes above `node`, nearest first, through every slot, up to the root
// or to where the parents loop back on themselves.
function ancestors(node: UiNode, byId: Map<string, UiNode>): UiNode[] {
  const seen = new Set<UiNode>([node]);
  const found: UiNode[] = [];
  for (let at = parentOf(node, byId); at && !seen.has(at);) {
    seen.add(at);
    found.push(at);
    at = parentOf(at, byId);
  }
  return found;
}

function inCycle(start: UiNode, byId: Map<string, UiNode>) {
  let current = start.parent === null ? undefined : byId.get(start.parent);
  for (let steps = 0; current && steps < byId.size; steps++) {
    if (current === start) return true;
    current = current.parent === null ? undefined : byId.get(current.parent);
  }
  return false;
}

function fail(rule: string, location: string, message: string): Failure {
  return { gate: "gate 1", rule, location, message };
}
