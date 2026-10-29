// The component frames of ADR 0015, as data: for each component, one variant
// per combination of its axes, each styled by calling the component's own
// tv() and mapping every class in each slot through class-map.ts. Nothing
// here needs Figma; components-runtime.js turns the payload into nodes.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { repo } from "../repo.ts";
import type { RegistryEntry } from "../src/registry/entry.ts";
import { figmaPayloadFile, type FigmaPayload } from "../tokens/build.ts";
import { classMap, type Look, type Mapping, type Tokens } from "./class-map.ts";

export type { Tokens } from "./class-map.ts";

export async function readTokens(): Promise<Tokens> {
  const [css, payload] = await Promise.all([
    readFile(join(repo, "tokens", "tokens.css"), "utf8"),
    readFile(join(repo, "tokens", figmaPayloadFile), "utf8"),
  ]);
  return { css, payload: JSON.parse(payload) as FigmaPayload };
}

// ── What a component hands the generator ──────────────────────────────────

export type Value = string | number | boolean;
export type Props = Record<string, Value>;

/** A component's `tv()` result, as the generator calls it. */
export type Styles = {
  variants: Record<string, Record<string, unknown>>;
  slots?: Record<string, unknown>;
  (props: Props): Record<string, (props?: Props) => string> | string;
};

/** A slot's element and what it holds, as the component's JSX nests them. */
export type Anatomy = {
  slot: string;
  children?: (
    Anatomy | { text: string } | VectorElement | Placeholder | false | undefined
  )[];
};

/**
 * The SVG a slot's element is, as the component renders it, drawn into the
 * slot's frame. Its `currentColor` is the colour the slots above it set.
 */
export type VectorElement = { vector: string; svg: string };

/**
 * Where the component renders another one. There's no instance (ADR 0015):
 * it's a named, empty frame with the other component's root box, from that
 * component's own tv().
 */
export type Placeholder = {
  placeholder: string;
  styles: Styles;
  props?: Props;
};

export type FrameSource = {
  entry: RegistryEntry;
  styles: Styles;
  /** The registry props the variants run over; by default, those tv() styles. */
  axes?: string[];
  /** An axis's values when tv() doesn't spell them, such as an icon map's names. */
  options?: Record<string, Value[]>;
  /** The tv() slots no frame draws, each with the reason. */
  notDrawn?: Record<string, string>;
  /** The props the component hands its tv() for one variant, when it changes any. */
  render?: (variant: Props) => Props;
  /** The element tree for one variant's rendered props. */
  anatomy: (props: Props) => Anatomy;
  /** Each text element's sample copy, by name, or for one variant's rendered props. */
  copy?: Copy;
};

export type Copy =
  Record<string, string> | ((props: Props) => Record<string, string>);

// ── What the runtime gets ─────────────────────────────────────────────────

/** Where a placed frame sits along one axis of its parent. */
export type Edge = {
  /** CENTER: in the middle, where an absolute child of a centring flex box sits. */
  constraint: "MIN" | "MAX" | "STRETCH" | "SCALE" | "CENTER";
  /** Its start, as a share of the parent's length. */
  start: number;
  /** Its length as a share of the parent's; its own (bound) length when null. */
  size: number | null;
  /** Its inset from the parent's end in px, when it's pinned there. */
  end: number | null;
};

export type FramePlan = {
  type: "FRAME";
  name: string;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  primaryAxisSizingMode?: "FIXED" | "AUTO";
  counterAxisSizingMode?: "FIXED" | "AUTO";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  /** 1 when it fills what's left along its parent's auto layout. */
  layoutGrow?: number;
  clipsContent?: boolean;
  strokeWeight?: number;
  /** Bindable field → variable name. */
  bind?: Record<string, string>;
  fills?: string[];
  strokes?: string[];
  effectStyle?: string | null;
  place?: { x: Edge; y: Edge } | null;
  children?: NodePlan[];
};

export type TextPlan = {
  type: "TEXT";
  name: string;
  characters: string;
  textStyle: string;
  fills: string[];
  textAutoResize?: string;
  textAlignHorizontal?: string;
  /** FILL when its frame's width is set from outside, so its lines wrap. */
  layoutSizingHorizontal?: "FILL";
};

/**
 * An SVG drawn to its frame's size. Each paint that's `currentColor` in it
 * binds to these variables; one that isn't stays the literal the SVG says,
 * and the dry run lists it.
 */
export type VectorPlan = {
  type: "VECTOR";
  name: string;
  svg: string;
  fills?: string[];
  strokes?: string[];
};

export type NodePlan = FramePlan | TextPlan | VectorPlan;

export type SetPlan = {
  name: string;
  description: string;
  /** Variants per row of the set's grid: the first axis's options. */
  columns: number;
  /** One root frame per variant, named `axis=value, …` as Figma names variants. */
  variants: FramePlan[];
};

export type ComponentsPayload = {
  page: string;
  /** Every set the sync owns, so a split script knows the others aren't orphans. */
  setNames: string[];
  /** The value a plan field takes when the plan leaves it out. */
  defaults: {
    frame: Required<Omit<FramePlan, "type" | "name">>;
    text: { textAutoResize: string; textAlignHorizontal: string };
  };
  sets: SetPlan[];
};

/** The page the sync owns. */
export const componentsPage = "Components";

const frameDefaults: ComponentsPayload["defaults"]["frame"] = {
  layoutMode: "NONE",
  primaryAxisAlignItems: "MIN",
  counterAxisAlignItems: "MIN",
  primaryAxisSizingMode: "AUTO",
  counterAxisSizingMode: "AUTO",
  layoutPositioning: "AUTO",
  layoutGrow: 0,
  clipsContent: false,
  strokeWeight: 0,
  bind: {},
  fills: [],
  strokes: [],
  effectStyle: null,
  place: null,
  children: [],
};
const textDefaults = {
  textAutoResize: "WIDTH_AND_HEIGHT",
  textAlignHorizontal: "LEFT",
};

// ── Generating ────────────────────────────────────────────────────────────

/** The payload for `sources`; throws on a class it can't map. */
export function framesPayload(
  sources: FrameSource[],
  tokens: Tokens
): ComponentsPayload {
  const map = classMap(tokens);
  const sets = sources.map((source) => setPlan(source, map));
  return {
    page: componentsPage,
    setNames: sets.map(({ name }) => name),
    defaults: { frame: frameDefaults, text: textDefaults },
    sets,
  };
}

type Axis = { name: string; values: Value[] };

function axesOf(source: FrameSource): Axis[] {
  const { entry, styles } = source;
  const names =
    source.axes ??
    Object.keys(entry.props.shape).filter((name) =>
      Object.hasOwn(styles.variants, name)
    );
  return names.map((name) => {
    const options = source.options?.[name];
    if (options) return { name, values: options };
    const keys = Object.keys(styles.variants[name] ?? {});
    if (!keys.length) {
      throw new Error(`${entry.name}: axis ${name} has no tv() options`);
    }
    // The rest state first: false before true.
    const values: Value[] = keys.every((k) => k === "true" || k === "false")
      ? [false, true]
      : keys.every((k) => /^\d+$/.test(k))
        ? keys.map(Number)
        : keys;
    return { name, values };
  });
}

/** Every combination, the first axis changing fastest: one grid row per rest. */
function combinations(axes: Axis[]): Props[] {
  let rows: Props[] = [{}];
  for (const axis of axes) {
    rows = rows.flatMap((row) =>
      axis.values.map((value) => ({ ...row, [axis.name]: value }))
    );
  }
  // flatMap made the last axis fastest; sort so the first is.
  const index = (props: Props) =>
    axes.reduceRight(
      (sum, axis) =>
        sum * axis.values.length + axis.values.indexOf(props[axis.name]!),
      0
    );
  return rows.sort((a, b) => index(a) - index(b));
}

function setPlan(source: FrameSource, map: (raw: string) => Mapping): SetPlan {
  const { entry, styles } = source;
  const axes = axesOf(source);
  const drawn = new Set<string>();
  const variants = combinations(axes).map((variant) => {
    const name = axes
      .map((axis) => `${axis.name}=${variant[axis.name]}`)
      .join(", ");
    const props = source.render?.(variant) ?? variant;
    const rendered = styles(props);
    const slots =
      typeof rendered === "string" ? { root: () => rendered } : rendered;
    const where = `${entry.name} (${name})`;
    const anatomy = source.anatomy(props);
    slotsOf(anatomy).forEach((slot) => drawn.add(slot));
    if (anatomy.slot !== "root") {
      throw new Error(
        `${where}: the anatomy's top element must be the root slot`
      );
    }
    const root = framePlan(anatomy, {
      where,
      slots,
      map,
      copy:
        typeof source.copy === "function"
          ? source.copy(props)
          : (source.copy ?? {}),
      text: {},
      parentLayout: null,
      parentAlign: {},
    });
    return { ...root, name };
  });
  // Every slot is drawn or says why not, so none leaves the frames unseen.
  const notDrawn = source.notDrawn ?? {};
  for (const slot of Object.keys(styles.slots ?? { root: "" })) {
    if (styles.slots?.[slot] === undefined && slot === "base") continue;
    if (!drawn.has(slot) && !Object.hasOwn(notDrawn, slot)) {
      throw new Error(
        `${entry.name}: no variant draws the ${slot} slot; put it in the anatomy in figma/components.ts, or in notDrawn with the reason`
      );
    }
  }
  return {
    name: entry.name,
    description: [
      entry.internal
        ? "Internal: only another component renders it, so a UI spec can't name it."
        : "",
      entry.use,
      `Generated by figma:sync-components from ${entry.name}'s tv() config; edits here are replaced on the next sync.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    columns: axes[0]?.values.length ?? 1,
    variants,
  };
}

type Context = {
  where: string;
  slots: Record<string, (props?: Props) => string>;
  map: (raw: string) => Mapping;
  copy: Record<string, string>;
  /** Text fields inherited from the slots above, as CSS inherits them. */
  text: Look;
  /** The parent frame's layout mode; null for the root. */
  parentLayout: string | null;
  /** The parent's auto-layout alignment across (x) and down (y). */
  parentAlign: { x?: string; y?: string };
};

/** The slots an anatomy draws. */
function slotsOf(anatomy: Anatomy): string[] {
  return [
    anatomy.slot,
    ...(anatomy.children ?? []).flatMap((child) =>
      child && "slot" in child ? slotsOf(child) : []
    ),
  ];
}

/** A slot's classes merged into one look: base first, then applied prefixes over it. */
function slotLook(slot: string, context: Context): Look {
  const render = context.slots[slot];
  if (!render) throw new Error(`${context.where}: tv() has no ${slot} slot`);
  const tiers: { look: Look; from: Record<string, string> }[] = [];
  for (const raw of render().split(/\s+/).filter(Boolean)) {
    const mapping = context.map(raw);
    if (mapping === null) {
      throw new Error(
        `${context.where}: the ${slot} slot's class ${raw} has no Figma mapping. Map it in figma/class-map.ts, or put its prefix on the skip list there.`
      );
    }
    if (mapping === "skip") continue;
    const tier = (tiers[mapping.applied] ??= { look: {}, from: {} });
    for (const [field, value] of Object.entries(mapping.look)) {
      const earlier = tier.from[field];
      if (
        earlier &&
        JSON.stringify(tier.look[field]) !== JSON.stringify(value)
      ) {
        throw new Error(
          `${context.where}: the ${slot} slot's classes ${earlier} and ${raw} both set ${field}`
        );
      }
      tier.look[field] = value;
      tier.from[field] = raw;
    }
  }
  return Object.assign({}, ...tiers.map((tier) => tier?.look ?? {}));
}

function framePlan(anatomy: Anatomy, context: Context): FramePlan {
  const look = slotLook(anatomy.slot, context);
  const field = (name: string) => look[name];
  const bind: Record<string, string> = {};
  for (const [name, value] of Object.entries(look)) {
    if (name.startsWith("bind.")) bind[name.slice(5)] = value as string;
  }
  // A square takes its one bound length, or its one limit, on both axes.
  if (field("square")) {
    for (const [a, b] of [
      ["width", "height"],
      ["minWidth", "minHeight"],
    ] as const) {
      if (bind[a] && !bind[b]) bind[b] = bind[a];
      else if (bind[b] && !bind[a]) bind[a] = bind[b];
    }
  }
  // The root fills whatever holds it; drawn alone, it's as long as its
  // max-* class lets it be.
  if (context.parentLayout === null) {
    for (const [axis, length, max] of [
      ["x", "width", "maxWidth"],
      ["y", "height", "maxHeight"],
    ] as const) {
      if (look[`${axis}.fraction`] !== 1) continue;
      if (!bind[max]) {
        throw new Error(
          `${context.where}: the root slot fills what holds it, and has no max-* class to draw it at`
        );
      }
      bind[length] = bind[max];
      delete bind[max];
      delete look[`${axis}.fraction`];
    }
  }

  // Without a flex class, a box that holds text is in block flow, which
  // stacks its lines and hugs them: vertical auto layout.
  const holdsText = (anatomy.children ?? []).some(
    (child) => child && "text" in child
  );
  const layoutMode = field("flex")
    ? ((field("direction") as FramePlan["layoutMode"]) ?? "HORIZONTAL")
    : holdsText
      ? "VERTICAL"
      : "NONE";
  const plan: FramePlan = { type: "FRAME", name: anatomy.slot, layoutMode };
  if (layoutMode !== "NONE") {
    // A bound length is fixed; an unbound one hugs.
    const [primary, counter] =
      layoutMode === "HORIZONTAL" ? ["width", "height"] : ["height", "width"];
    plan.primaryAxisSizingMode = bind[primary!] ? "FIXED" : "AUTO";
    plan.counterAxisSizingMode = bind[counter!] ? "FIXED" : "AUTO";
    // Growing along its parent's auto layout fixes that length too.
    const parent = context.parentLayout;
    if (field("layoutGrow") && parent && parent !== "NONE") {
      if (parent === layoutMode) plan.primaryAxisSizingMode = "FIXED";
      else plan.counterAxisSizingMode = "FIXED";
    }
    plan.primaryAxisAlignItems = field("primaryAxisAlignItems") as string;
    plan.counterAxisAlignItems = field("counterAxisAlignItems") as string;
  }
  plan.layoutPositioning = field("layoutPositioning") as "ABSOLUTE";
  plan.layoutGrow = field("layoutGrow") as number;
  plan.clipsContent = field("clipsContent") as boolean;
  plan.strokeWeight = field("strokeWeight") as number;
  plan.bind = bind;
  plan.fills = field("fills") as string[];
  plan.strokes = field("strokes") as string[];
  plan.effectStyle = field("effectStyle") as string;

  // A frame outside its parent's auto layout sits where its insets put it.
  const placed =
    context.parentLayout === "NONE" || plan.layoutPositioning === "ABSOLUTE";
  const placing = Object.keys(look).filter((name) => /^[xy]\./.test(name));
  if (placed) {
    // Absolute without insets, it sits where its parent's alignment puts it.
    const align =
      plan.layoutPositioning === "ABSOLUTE" ? context.parentAlign : {};
    plan.place = {
      x: edge(look, "x", Boolean(bind.width), align.x),
      y: edge(look, "y", Boolean(bind.height), align.y),
    };
  } else if (placing.length) {
    throw new Error(
      `${context.where}: the ${anatomy.slot} slot is in auto layout, where figma:sync-components can't place it by ${placing.join(", ")} yet`
    );
  }

  const text: Look = { ...context.text };
  for (const [name, value] of Object.entries(look)) {
    if (name.startsWith("text.")) text[name.slice(5)] = value;
  }
  // Its width set from outside, its text fills it and wraps.
  const fixedWidth =
    layoutMode !== "NONE" &&
    (layoutMode === "HORIZONTAL"
      ? plan.primaryAxisSizingMode
      : plan.counterAxisSizingMode) === "FIXED";
  const across =
    layoutMode === "HORIZONTAL"
      ? [plan.primaryAxisAlignItems, plan.counterAxisAlignItems]
      : [plan.counterAxisAlignItems, plan.primaryAxisAlignItems];
  const childContext: Context = {
    ...context,
    text,
    parentLayout: layoutMode,
    parentAlign: layoutMode === "NONE" ? {} : { x: across[0], y: across[1] },
  };
  const children: NodePlan[] = [];
  for (const child of anatomy.children ?? []) {
    if (!child) continue;
    if ("vector" in child) {
      children.push(vectorPlan(child, text, context.where));
    } else if ("placeholder" in child) {
      const rendered = child.styles(child.props ?? {});
      const box = framePlan(
        { slot: "root" },
        {
          ...childContext,
          where: `${context.where}: the ${child.placeholder} placeholder`,
          slots:
            typeof rendered === "string" ? { root: () => rendered } : rendered,
        }
      );
      children.push({ ...box, name: child.placeholder });
    } else if ("text" in child) {
      const characters = context.copy[child.text];
      if (characters === undefined) {
        throw new Error(
          `${context.where}: no sample copy for the ${child.text} text; add it to figma/components.ts`
        );
      }
      if (!text.textStyle || !text.fills) {
        throw new Error(
          `${context.where}: the ${child.text} text has no ${text.textStyle ? "colour" : "type"} class above it`
        );
      }
      const plan: TextPlan = {
        type: "TEXT",
        name: child.text,
        characters,
        textStyle: text.textStyle as string,
        fills: text.fills as string[],
      };
      for (const field of ["textAutoResize", "textAlignHorizontal"] as const) {
        const value = text[field] as string | undefined;
        if (value && value !== textDefaults[field]) plan[field] = value;
      }
      if (fixedWidth && !text.textAutoResize) {
        plan.textAutoResize = "HEIGHT";
        plan.layoutSizingHorizontal = "FILL";
      }
      children.push(plan);
    } else {
      children.push(framePlan(child, childContext));
    }
  }
  plan.children = children;
  return compact(plan) as FramePlan;
}

function vectorPlan(
  element: VectorElement,
  text: Look,
  where: string
): VectorPlan {
  const plan: VectorPlan = {
    type: "VECTOR",
    name: element.vector,
    svg: element.svg,
  };
  for (const [attribute, paint] of [
    ["fill", "fills"],
    ["stroke", "strokes"],
  ] as const) {
    if (!element.svg.includes(`${attribute}="currentColor"`)) continue;
    if (!text.fills) {
      throw new Error(
        `${where}: the ${element.vector} vector's ${attribute} is currentColor, with no colour class above it`
      );
    }
    plan[paint] = text.fills as string[];
  }
  return plan;
}

function edge(
  look: Look,
  axis: "x" | "y",
  bound: boolean,
  align?: string
): Edge {
  const start = look[`${axis}.start`] as number | undefined;
  const end = look[`${axis}.end`] as number | undefined;
  const fraction = look[`${axis}.fraction`] as number | undefined;
  const shift = (look[`${axis}.shift`] as number | undefined) ?? 0;
  if (fraction !== undefined && !bound) {
    const at = shift * fraction;
    return {
      constraint: fraction === 1 && at === 0 ? "STRETCH" : "SCALE",
      start: at,
      size: fraction,
      end: null,
    };
  }
  // Only zero insets are mapped, so a start and an end are a full stretch.
  if (start !== undefined && end !== undefined && !bound) {
    return { constraint: "STRETCH", start: 0, size: 1, end: null };
  }
  if (end !== undefined)
    return { constraint: "MAX", start: 0, size: null, end };
  if (start === undefined && align === "CENTER") {
    return { constraint: "CENTER", start: 0, size: null, end: null };
  }
  return { constraint: "MIN", start: 0, size: null, end: null };
}

/** The plan without the fields its defaults already say, so the script stays short. */
function compact(plan: FramePlan): Partial<FramePlan> {
  return Object.fromEntries(
    Object.entries(plan).filter(([name, value]) => {
      if (value === undefined) return false;
      const fallback = (frameDefaults as Record<string, unknown>)[name];
      return (
        fallback === undefined ||
        JSON.stringify(fallback) !== JSON.stringify(value)
      );
    })
  );
}
