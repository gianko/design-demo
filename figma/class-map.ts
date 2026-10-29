// How each Tailwind class on a library component reaches a Figma frame
// (ADR 0015). A class maps to a look: a few flat fields of the frame's plan,
// such as `fills`, `bind.paddingLeft` or `text.textStyle`, which frames.ts
// merges per slot. Token classes go through tokens.css: the class names a
// `@theme` key, the key names a `--ds-*` variable, and the variable is the
// Figma variable whose WEB code syntax is that name. Layout classes are a
// hand-written table, and the rest are on the skip and still lists. A class
// none of them covers has no mapping, and generation stops on it.
//
// #321 and #322 extend these tables as the other components need them.

import { classTokens } from "../lint/taste/classes.ts";
import type { FigmaPayload } from "../tokens/build.ts";

/** One look field: a frame or text property, a binding, or a placement. */
export type Look = Record<string, unknown>;

export type Tokens = { css: string; payload: FigmaPayload };

/**
 * What a variant prefix does to its class. Pseudo-states are skipped, so a
 * frame shows the rest state. A frame is still, so it takes the
 * reduced-motion look: a `motion-reduce:` class applies, over the class it
 * overrides in CSS.
 */
export const prefixes: Record<string, "skip" | "apply"> = {
  hover: "skip",
  active: "skip",
  "focus-visible": "skip",
  before: "skip",
  "motion-reduce": "apply",
  // Sheet's ::backdrop, the scrim behind the panel, isn't the panel's frame.
  backdrop: "skip",
  // DataTable's cell styles its children, which a frame holds as placeholders.
  "*": "skip",
  // Checkbox: its box follows the input's states.
  "peer-hover": "skip",
  "peer-active": "skip",
  "peer-focus-visible": "skip",
};

/** Motion classes: a frame is still, so they have no look. */
export const stillClasses: RegExp[] = [
  /^transition(-|$)/,
  /^ease-/,
  /^duration-/,
  /^delay-/,
  /^animate-/,
  /^origin-/,
  // Sheet's and Toast's View Transition names.
  /^vt-/,
];

/**
 * Layout and structure classes, and what each is in Figma. Placement fields
 * (`x.*`, `y.*`) place a frame that isn't in its parent's auto layout:
 * `start` and `end` are insets in px, `fraction` its size as a share of the
 * parent's, and `shift` a translate in its own size.
 */
export const layoutClasses: Record<string, Look> = {
  flex: { flex: true },
  "inline-flex": { flex: true },
  "flex-col": { direction: "VERTICAL" },
  "items-start": { counterAxisAlignItems: "MIN" },
  "items-center": { counterAxisAlignItems: "CENTER" },
  "items-end": { counterAxisAlignItems: "MAX" },
  "justify-start": { primaryAxisAlignItems: "MIN" },
  "justify-center": { primaryAxisAlignItems: "CENTER" },
  "justify-end": { primaryAxisAlignItems: "MAX" },
  "justify-between": { primaryAxisAlignItems: "SPACE_BETWEEN" },
  // Every Figma frame is a positioning context, and a frame's child is a box.
  relative: {},
  block: {},
  absolute: { layoutPositioning: "ABSOLUTE" },
  "overflow-hidden": { clipsContent: true },
  // A 1px edge: border widths aren't tokens.
  border: { strokeWeight: 1 },
  "whitespace-nowrap": { "text.textAutoResize": "WIDTH_AND_HEIGHT" },
  "inset-0": { "x.start": 0, "x.end": 0, "y.start": 0, "y.end": 0 },
  "inset-x-0": { "x.start": 0, "x.end": 0 },
  "inset-y-0": { "y.start": 0, "y.end": 0 },
  "top-0": { "y.start": 0 },
  "bottom-0": { "y.end": 0 },
  "left-0": { "x.start": 0 },
  "right-0": { "x.end": 0 },
  "w-0": { "x.fraction": 0 },
  "h-0": { "y.fraction": 0 },
  "w-full": { "x.fraction": 1 },
  "h-full": { "y.fraction": 1 },
  "translate-x-full": { "x.shift": 1 },
  "translate-y-full": { "y.shift": 1 },

  // PageHeader. A frame that hugs its content never runs out of room to
  // wrap; frames.ts throws where a fixed length would make it matter.
  "flex-wrap": { wrap: true },

  // Sheet, Toast and DataTable. Pushed to the end of its line, through
  // spare room: a parent that hugs, or the root, has none, and frames.ts
  // throws where a fixed length would leave some.
  "ms-auto": { pushed: true },
  // Sheet. No ceiling: a root that fills the window's height, which a frame
  // drawn alone hasn't got, hugs its content instead (frames.ts).
  "max-h-none": { "uncapped.y": true },
  // Limits relative to the page, the parent or the content, which a frame
  // of sample copy never reaches.
  "max-w-full": {},
  "min-h-0": {},
  // A frame clips where the element scrolls; a frame doesn't scroll.
  "overflow-y-auto": { clipsContent: true },
  // A focus outline, which a frame at rest doesn't have.
  "outline-hidden": {},

  // DataTable.
  "overflow-x-auto": { clipsContent: true },
  // As wide as its content, and at least its parent, which hugs it.
  "w-max": {},
  "min-w-full": {},
  // Adjacent cells' borders merging, and its cells have none.
  "border-collapse": {},
  // A cell's content, centred down its row's height.
  "align-middle": { counterAxisAlignItems: "CENTER" },
  "text-nowrap": { "text.textAutoResize": "WIDTH_AND_HEIGHT" },
  // The start edge, where a frame's content sits already.
  "text-left": {},
  // A rule along the top: a 1px edge on that side only.
  "border-t": { strokeTopWeight: 1 },
  // Stuck to the start edge as its container scrolls; frames.ts keeps a
  // sticky frame in the flow.
  sticky: { sticky: true },
  "start-0": { "x.start": 0 },
  // StatusTag: a box that hugs its line, as any block does.
  "inline-block": {},
  // Amount: a table amount ends at its end edge.
  "text-right": { "text.textAlignHorizontal": "RIGHT" },
  // Checkbox: frames.ts gives a square's one bound length to both axes.
  "aspect-square": { square: true },
  // An edge that keeps its width with no colour: in Figma, no stroke paint.
  "border-transparent": { strokes: [] },
  // IconButton: Figma's auto layout never shrinks a child.
  "shrink-0": {},
  // Toast, Sheet and PageHeader: it takes the room its siblings leave along a
  // fixed length; frames.ts drops it in a parent that hugs, which leaves none.
  grow: { layoutGrow: 1 },
};

/**
 * Classes with no look a Figma frame can take, each with the reason. They
 * are skipped, so a class leaves the frames only by being listed here.
 */
export const unseenClasses: Record<string, string> = {
  // Amount
  "tabular-nums":
    "the Plugin API reads a text's OpenType features but can't set them",
  // Checkbox
  "pointer-events-none":
    "it says where the pointer goes, which a frame has no say in",
  // Toast
  "pointer-events-auto":
    "it says where the pointer goes, which a frame has no say in",
};

const corners = [
  "topLeftRadius",
  "topRightRadius",
  "bottomLeftRadius",
  "bottomRightRadius",
];

/**
 * Token class families: the class prefix, the `@theme` namespaces its name
 * may come from, in order, and the look of the Figma variable it resolves to.
 */
export const tokenFamilies: {
  prefix: string;
  theme: string[];
  look: (variable: string) => Look;
}[] = [
  { prefix: "bg-", theme: ["background-color"], look: (v) => ({ fills: [v] }) },
  {
    prefix: "text-",
    theme: ["text-color"],
    look: (v) => ({ "text.fills": [v] }),
  },
  {
    prefix: "border-",
    theme: ["border-color"],
    look: (v) => ({ strokes: [v] }),
  },
  {
    prefix: "rounded-",
    theme: ["radius"],
    look: (v) => Object.fromEntries(corners.map((c) => [`bind.${c}`, v])),
  },
  // Sheet: the corners facing the page, in a left-to-right file.
  {
    prefix: "rounded-s-",
    theme: ["radius"],
    look: (v) => ({ "bind.topLeftRadius": v, "bind.bottomLeftRadius": v }),
  },
  {
    prefix: "h-",
    theme: ["height", "spacing"],
    look: (v) => ({ "bind.height": v }),
  },
  {
    prefix: "w-",
    theme: ["width", "spacing"],
    look: (v) => ({ "bind.width": v }),
  },
  ...(
    [
      ["p-", ["Top", "Right", "Bottom", "Left"]],
      ["px-", ["Left", "Right"]],
      ["py-", ["Top", "Bottom"]],
      ["pt-", ["Top"]],
      ["pr-", ["Right"]],
      ["pb-", ["Bottom"]],
      ["pl-", ["Left"]],
      // Toast: inline start and end, which are left and right in English,
      // the product's one language.
      ["ps-", ["Left"]],
      ["pe-", ["Right"]],
    ] as const
  ).map(([prefix, sides]) => ({
    prefix,
    theme: ["padding", "spacing"],
    look: (v: string) =>
      Object.fromEntries(sides.map((side) => [`bind.padding${side}`, v])),
  })),
  {
    prefix: "gap-",
    theme: ["spacing"],
    look: (v) => ({ "bind.itemSpacing": v }),
  },
  // Checkbox, Card, EmptyState, Sheet and DataTable: a length's floor and
  // ceiling, from Tailwind's own namespaces for them.
  {
    prefix: "min-h-",
    theme: ["min-height", "height", "spacing"],
    look: (v) => ({ "bind.minHeight": v }),
  },
  {
    prefix: "max-h-",
    theme: ["max-height", "height", "spacing"],
    look: (v) => ({ "bind.maxHeight": v }),
  },
  {
    prefix: "size-",
    theme: ["size", "spacing"],
    look: (v) => ({ "bind.width": v, "bind.height": v }),
  },
  // Text and Toast keep a measure, Card a card's width.
  {
    prefix: "max-w-",
    theme: ["max-width", "spacing"],
    look: (v) => ({ "bind.maxWidth": v }),
  },
  // DataTable's footer: a gap across and a gap down, which frames.ts gives
  // the frame's own direction.
  { prefix: "gap-x-", theme: ["spacing"], look: (v) => ({ "gap.x": v }) },
  { prefix: "gap-y-", theme: ["spacing"], look: (v) => ({ "gap.y": v }) },
];

/**
 * A slot placeholder's look (frames.ts), where a UI spec puts components: a
 * tinted chip naming what goes there, in muted caption type, so it doesn't
 * read as content. A placeholder for another library component takes that
 * component's own root box instead.
 */
export const placeholderClasses =
  "flex items-center rounded-control bg-surface-hover px-xs py-3xs text-caption text-ink-muted";

/** A class's look, "skip" for none, or null when nothing maps it. */
export type Mapping = { look: Look; applied: number } | "skip" | null;

/** The class map for these tokens: class in, mapping out. */
export function classMap(tokens: Tokens): (raw: string) => Mapping {
  const theme = themeKeys(tokens.css);
  const variableByCss = new Map<string, string>();
  for (const collection of tokens.payload.collections) {
    for (const variable of collection.variables) {
      if (!variable.css) continue;
      // A --ds-* variable's CSS name is its Figma name with / as - (ADR 0005).
      variableByCss.set(
        `--ds-${variable.name.split("/").join("-")}`,
        variable.name
      );
    }
  }
  const effectByCss = new Map(
    tokens.payload.effectStyles.map(({ name }) => [
      `--ds-${name.split("/").join("-")}`,
      name,
    ])
  );
  const textRoles = new Set(
    [...tokens.css.matchAll(/@utility text-([\w-]+) \{/g)].map(([, r]) => r!)
  );
  const textStyles = new Set(tokens.payload.textStyles.map(({ name }) => name));

  const utility = (name: string): Look | "skip" | null => {
    if (Object.hasOwn(layoutClasses, name)) return layoutClasses[name]!;
    if (stillClasses.some((pattern) => pattern.test(name))) return "skip";
    if (Object.hasOwn(unseenClasses, name)) return "skip";
    const fraction = /^([wh])-(\d+)\/(\d+)$/.exec(name);
    if (fraction) {
      const [, side, top, bottom] = fraction;
      return {
        [`${side === "w" ? "x" : "y"}.fraction`]: Number(top) / Number(bottom),
      };
    }
    if (name.startsWith("text-") && textRoles.has(name.slice(5))) {
      const role = name.slice(5);
      return textStyles.has(role) ? { "text.textStyle": role } : null;
    }
    if (name.startsWith("shadow-")) {
      const css = theme.get(name);
      const style = css && effectByCss.get(css);
      return style ? { effectStyle: style } : null;
    }
    for (const family of tokenFamilies) {
      if (!name.startsWith(family.prefix)) continue;
      const key = name.slice(family.prefix.length);
      for (const namespace of family.theme) {
        const css = theme.get(`${namespace}-${key}`);
        const variable = css && variableByCss.get(css);
        if (variable) return family.look(variable);
      }
    }
    return null;
  };

  return (raw) => {
    const [token] = classTokens(raw);
    if (!token) return "skip";
    let applied = 0;
    for (const variant of token.variants) {
      const does = prefixes[variant];
      if (does === undefined) return null;
      if (does === "skip") return "skip";
      applied++;
    }
    const look = utility(token.utility);
    if (look === null || look === "skip") return look;
    return { look, applied };
  };
}

/** `@theme` key → the `--ds-*` variable it is, e.g. `radius-control` → `--ds-radius-control`. */
function themeKeys(css: string): Map<string, string> {
  const block = /@theme inline \{([^}]*)\}/.exec(css)?.[1] ?? "";
  return new Map(
    [...block.matchAll(/--([\w-]+):\s*var\((--ds-[\w-]+)\);/g)].map(
      ([, key, ds]) => [key!, ds!]
    )
  );
}
