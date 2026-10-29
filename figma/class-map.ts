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
};

/** Motion classes: a frame is still, so they have no look. */
export const stillClasses: RegExp[] = [
  /^transition(-|$)/,
  /^ease-/,
  /^duration-/,
  /^delay-/,
  /^animate-/,
  /^origin-/,
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
];

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
