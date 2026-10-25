// The hand-written token build of ADR 0005. It reads the DTCG sources in this
// folder, validates them, and writes tokens.css, tokens.ts and figma.json. Run it with
// `pnpm tokens`; `--source <dir>` and `--out <dir>` point it elsewhere.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { converter, inGamut, wcagContrast, type Oklch } from "culori";
import { z } from "zod";
import { tokenNames } from "./naming.ts";

// ── Collections ───────────────────────────────────────────────────────────

// One source file per collection and mode. A multi-mode collection is a CSS
// scope set by a data attribute; its first mode is also the :root default.
const collections: Record<
  string,
  { attribute: string; modes: string[] } | null
> = {
  primitives: null,
  color: { attribute: "data-theme", modes: ["light", "dark"] },
  density: { attribute: "data-density", modes: ["admin", "contractor"] },
  space: null,
  size: null,
  radius: null,
  type: null,
  motion: null,
  z: null,
};

const sourceFiles = Object.entries(collections).flatMap(([name, scope]) =>
  scope ? scope.modes.map((mode) => `${name}.${mode}`) : [name]
);

// Where only names matter, the default mode stands for its collection: every
// mode has the same paths.
const defaultFiles = Object.entries(collections).map(([name, scope]) =>
  scope ? `${name}.${scope.modes[0]}` : name
);

// ── Checks ────────────────────────────────────────────────────────────────

export type Check =
  | "schema"
  | "modes-match"
  | "unique-names"
  | "gamut"
  | "contrast"
  | "neutral-tint"
  | "settle"
  | "neutral-elevation"
  | "banned-font"
  | "keyframes"
  | "figma";

export type Failure = {
  check: Check;
  path: string;
  file: string;
  message: string;
};

export type Sources = { files: Record<string, unknown>; keyframes: string };
export type Built = { ok: true; css: string; ts: string; figma: string };
export type BuildResult = Built | { ok: false; failures: Failure[] };

// The design brief's banned fonts, plus their families ("Inter Tight").
const bannedFonts = ["Inter", "Geist", "Roboto", "Arial", "Space Grotesk"];
// The most chroma a shadow colour may carry and still read as neutral.
const neutralChroma = 0.03;
// `settle` overshoots once, by at most this much.
const maxOvershoot = 0.05;

// ── Schema ────────────────────────────────────────────────────────────────

const alias = z.string().regex(/^\{[^{}]+\}$/, "must be an alias like {a.b}");
const or = <T extends z.ZodType>(schema: T) => z.union([schema, alias]);

const color = z.strictObject({
  colorSpace: z.literal("oklch"),
  components: z.tuple([
    z.number().min(0).max(1),
    z.number().min(0),
    z.number(),
  ]),
  alpha: z.number().min(0).max(1).optional(),
});
const dimension = z.strictObject({ value: z.number(), unit: z.literal("px") });
const duration = z.strictObject({
  value: z.number().min(0),
  unit: z.literal("ms"),
});
const cubicBezier = z.tuple([
  z.number().min(0).max(1),
  z.number(),
  z.number().min(0).max(1),
  z.number(),
]);
const fontFamily = z.union([z.string(), z.array(z.string()).nonempty()]);
const fontWeight = z.number().int().min(1).max(1000);
const shadowLayer = z.strictObject({
  color: or(color),
  offsetX: or(dimension),
  offsetY: or(dimension),
  blur: or(dimension),
  spread: or(dimension),
  inset: z.boolean().optional(),
});

const valueSchemas = {
  color,
  dimension,
  duration,
  cubicBezier,
  fontFamily,
  fontWeight,
  number: z.number(),
  shadow: z.union([shadowLayer, z.array(shadowLayer).nonempty()]),
  typography: z.strictObject({
    fontFamily: or(fontFamily),
    fontSize: or(dimension),
    fontWeight: or(fontWeight),
    letterSpacing: or(dimension),
    lineHeight: or(z.number().positive()),
  }),
  transition: z.strictObject({
    duration: or(duration),
    delay: or(duration),
    timingFunction: or(cubicBezier),
  }),
};

type TokenType = keyof typeof valueSchemas;
const tokenType = z.enum(
  Object.keys(valueSchemas) as [TokenType, ...TokenType[]]
);

const extensions = z
  .object({
    "design-demo": z
      .strictObject({
        // A foreground role must reach `min` against each background, in every theme.
        contrast: z
          .strictObject({
            min: z.number().positive(),
            against: z.array(alias).nonempty(),
          })
          .optional(),
        animation: z
          .strictObject({
            iterations: z
              .union([z.number().positive(), z.literal("infinite")])
              .optional(),
            fillMode: z
              .enum(["none", "forwards", "backwards", "both"])
              .optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .optional();

const tokenKeys = z.strictObject({
  $value: z.unknown(),
  $type: tokenType.optional(),
  $description: z.string().optional(),
  $extensions: extensions,
});

const groupMeta = z.object({
  $type: tokenType.optional(),
  $description: z.string().optional(),
});

type Token = {
  path: string;
  file: string;
  type: TokenType;
  value: unknown;
  extensions: z.infer<typeof extensions>;
};

class Failures {
  readonly list: Failure[] = [];
  add(check: Check, path: string, file: string, message: string) {
    this.list.push({ check, path, file, message });
  }
}

function parseFile(file: string, json: unknown, failures: Failures): Token[] {
  const tokens: Token[] = [];

  function walk(node: unknown, segments: string[], inherited?: TokenType) {
    const path = segments.join(".");
    if (typeof node !== "object" || node === null || Array.isArray(node)) {
      failures.add("schema", path, file, "is neither a token nor a group");
      return;
    }
    if ("$value" in node) {
      const keys = tokenKeys.safeParse(node);
      if (!keys.success) {
        failures.add("schema", path, file, z.prettifyError(keys.error));
        return;
      }
      const type = keys.data.$type ?? inherited;
      if (!type) {
        failures.add(
          "schema",
          path,
          file,
          "has no $type, on itself or a group"
        );
        return;
      }
      const value = keys.data.$value;
      const isAlias = typeof value === "string" && value.startsWith("{");
      const parsed = (isAlias ? alias : valueSchemas[type]).safeParse(value);
      if (!parsed.success) {
        failures.add(
          "schema",
          path,
          file,
          `is not a valid ${type}: ${z.prettifyError(parsed.error)}`
        );
        return;
      }
      tokens.push({
        path,
        file,
        type,
        value,
        extensions: keys.data.$extensions,
      });
      return;
    }
    const meta = groupMeta.safeParse(node);
    if (!meta.success) {
      failures.add("schema", path, file, z.prettifyError(meta.error));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$")) {
        if (key !== "$type" && key !== "$description") {
          failures.add(
            "schema",
            [...segments, key].join("."),
            file,
            `unknown group property ${key}`
          );
        }
        continue;
      }
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key)) {
        failures.add(
          "schema",
          [...segments, key].join("."),
          file,
          "names must be lowercase kebab-case"
        );
        continue;
      }
      walk(child, [...segments, key], meta.data.$type ?? inherited);
    }
  }

  walk(json, []);
  return tokens;
}

// ── Aliases ───────────────────────────────────────────────────────────────

type Scope = Map<string, Token>;

function resolve(value: unknown, scope: Scope, depth = 0): unknown {
  if (typeof value === "string" && /^\{[^{}]+\}$/.test(value)) {
    const target = scope.get(value.slice(1, -1));
    if (!target)
      throw new Error(`refers to ${value}, which doesn't exist here`);
    if (depth > 8) throw new Error(`refers to ${value} in a loop`);
    return resolve(target.value, scope, depth + 1);
  }
  if (Array.isArray(value))
    return value.map((item) => resolve(item, scope, depth));
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolve(item, scope, depth),
      ])
    );
  }
  return value;
}

type ColorValue = z.infer<typeof color>;
type Dimension = z.infer<typeof dimension>;
type Duration = z.infer<typeof duration>;
type ShadowLayer = {
  color: ColorValue;
  offsetX: Dimension;
  offsetY: Dimension;
  blur: Dimension;
  spread: Dimension;
  inset?: boolean;
};
type Typography = {
  fontFamily: string | string[];
  fontSize: Dimension;
  fontWeight: number;
  letterSpacing: Dimension;
  lineHeight: number;
};
type Transition = {
  duration: Duration;
  delay: Duration;
  timingFunction: number[];
};

/** A token after alias resolution, in the one mode file it was resolved for. */
type Resolved = Token & { resolved: unknown };

// ── Build ─────────────────────────────────────────────────────────────────

export function build({ files, keyframes }: Sources): BuildResult {
  const failures = new Failures();

  for (const file of sourceFiles) {
    if (!(file in files))
      failures.add("schema", "", `${file}.json`, "is missing");
  }
  for (const file of Object.keys(files)) {
    if (!sourceFiles.includes(file)) {
      failures.add(
        "schema",
        "",
        `${file}.json`,
        "isn't a known collection or mode"
      );
    }
  }
  if (failures.list.length) return { ok: false, failures: failures.list };

  const parsed = new Map(
    sourceFiles.map((file) => [
      file,
      parseFile(`${file}.json`, files[file], failures),
    ])
  );
  if (failures.list.length) return { ok: false, failures: failures.list };

  // A mode file resolves aliases against itself and every single-mode collection.
  const shared = Object.entries(collections)
    .filter(([, scope]) => !scope)
    .flatMap(([name]) => parsed.get(name)!);
  const resolvedFiles = new Map<string, Resolved[]>();
  for (const [file, tokens] of parsed) {
    const scope: Scope = new Map(
      [...shared, ...tokens].map((token) => [token.path, token])
    );
    const resolved: Resolved[] = [];
    for (const token of tokens) {
      try {
        resolved.push({ ...token, resolved: resolve(token.value, scope) });
      } catch (error) {
        failures.add(
          "schema",
          token.path,
          token.file,
          (error as Error).message
        );
      }
      for (const against of token.extensions?.["design-demo"]?.contrast
        ?.against ?? []) {
        if (!scope.has(against.slice(1, -1))) {
          failures.add(
            "schema",
            token.path,
            token.file,
            `declares contrast against ${against}, which doesn't exist here`
          );
        }
      }
    }
    resolvedFiles.set(file, resolved);
  }
  if (failures.list.length) return { ok: false, failures: failures.list };

  checkModesMatch(parsed, failures);
  checkUniqueNames(parsed, failures);
  const all = [...resolvedFiles.values()].flat();
  checkGamut(all, failures);
  for (const tokens of resolvedFiles.values()) checkContrast(tokens, failures);
  checkNeutralTint(all, failures);
  checkEasings(all, failures);
  checkElevation(all, failures);
  checkFonts(all, failures);
  checkKeyframes(all, keyframes, failures);
  for (const [part, path] of Object.entries(focusRing)) {
    if (!all.some((token) => token.path === path)) {
      failures.add(
        "schema",
        path,
        "",
        `is missing; it is the focus ring's ${part}`
      );
    }
  }
  if (failures.list.length) return { ok: false, failures: failures.list };

  // Payload checks assume valid, matching modes.
  const figma = emitFigma(resolvedFiles, failures);
  if (failures.list.length) return { ok: false, failures: failures.list };

  return {
    ok: true,
    css: emitCss(resolvedFiles, keyframes),
    ts: emitTs(parsed),
    figma: `${JSON.stringify(figma, null, 2)}\n`,
  };
}

// ── Validations ───────────────────────────────────────────────────────────

function checkModesMatch(parsed: Map<string, Token[]>, failures: Failures) {
  for (const [name, scope] of Object.entries(collections)) {
    if (!scope) continue;
    const [first, ...rest] = scope.modes.map((mode) => `${name}.${mode}`);
    const reference = new Map(
      parsed.get(first!)!.map((token) => [token.path, token])
    );
    for (const file of rest) {
      const tokens = new Map(
        parsed.get(file)!.map((token) => [token.path, token])
      );
      for (const [path, token] of reference) {
        const other = tokens.get(path);
        if (!other) {
          failures.add(
            "modes-match",
            path,
            `${file}.json`,
            `is in ${first}.json but missing here`
          );
        } else if (other.type !== token.type) {
          failures.add(
            "modes-match",
            path,
            `${file}.json`,
            `is a ${other.type} here but a ${token.type} in ${first}.json`
          );
        } else if (
          JSON.stringify(other.extensions) !== JSON.stringify(token.extensions)
        ) {
          failures.add(
            "modes-match",
            path,
            `${file}.json`,
            `has different $extensions from ${first}.json`
          );
        }
      }
      for (const path of tokens.keys()) {
        if (!reference.has(path)) {
          failures.add(
            "modes-match",
            path,
            `${file}.json`,
            `is here but missing from ${first}.json`
          );
        }
      }
    }
  }
}

function checkUniqueNames(parsed: Map<string, Token[]>, failures: Failures) {
  const seen = new Map<string, string>();
  for (const file of defaultFiles) {
    for (const token of parsed.get(file)!) {
      const { className } = tokenNames(token.path);
      if (!className) continue;
      const owner = seen.get(className);
      if (owner) {
        failures.add(
          "unique-names",
          token.path,
          token.file,
          `makes .${className}, which ${owner} already makes`
        );
      }
      seen.set(className, token.path);
    }
  }
}

function colorsOf(token: Resolved): ColorValue[] {
  if (token.type === "color") return [token.resolved as ColorValue];
  if (token.type === "shadow") return layers(token).map((layer) => layer.color);
  return [];
}

function layers(token: Resolved): ShadowLayer[] {
  const value = token.resolved as ShadowLayer | ShadowLayer[];
  return Array.isArray(value) ? value : [value];
}

const oklch = ({ components: [l, c, h], alpha }: ColorValue): Oklch => ({
  mode: "oklch",
  l,
  c,
  h,
  alpha,
});

const displayable = inGamut("rgb");

function checkGamut(tokens: Resolved[], failures: Failures) {
  for (const token of tokens) {
    // A role that only aliases a primitive is checked once, as the primitive.
    if (typeof token.value === "string") continue;
    for (const value of colorsOf(token)) {
      if (!displayable(oklch(value))) {
        failures.add(
          "gamut",
          token.path,
          token.file,
          `${cssColor(value)} is outside sRGB, so Figma would show a different colour`
        );
      }
    }
  }
}

function checkContrast(tokens: Resolved[], failures: Failures) {
  const byPath = new Map(tokens.map((token) => [token.path, token]));
  for (const token of tokens) {
    const contrast = token.extensions?.["design-demo"]?.contrast;
    if (!contrast) continue;
    for (const against of contrast.against) {
      const background = byPath.get(against.slice(1, -1))!;
      const ratio = wcagContrast(
        oklch(token.resolved as ColorValue),
        oklch(background.resolved as ColorValue)
      );
      if (ratio < contrast.min) {
        failures.add(
          "contrast",
          token.path,
          token.file,
          `is ${Math.floor(ratio * 100) / 100}:1 on ${background.path}, needs ${contrast.min}:1`
        );
      }
    }
  }
}

function checkNeutralTint(tokens: Resolved[], failures: Failures) {
  for (const token of tokens) {
    // A role that only aliases a primitive is checked once, as the primitive.
    if (typeof token.value === "string") continue;
    if (colorsOf(token).some(({ components: [, chroma] }) => chroma <= 0)) {
      failures.add(
        "neutral-tint",
        token.path,
        token.file,
        "has chroma 0; every neutral is tinted toward plum"
      );
    }
  }
}

/** Samples a cubic-bezier easing's progress over its parameter. */
function progressCurve([, y1, , y2]: number[]): number[] {
  const points: number[] = [];
  for (let step = 0; step <= 1000; step++) {
    const t = step / 1000;
    points.push(
      3 * (1 - t) ** 2 * t * y1! + 3 * (1 - t) * t ** 2 * y2! + t ** 3
    );
  }
  return points;
}

function checkEasings(tokens: Resolved[], failures: Failures) {
  const easings = tokens.filter((token) => token.type === "cubicBezier");
  if (!easings.some((token) => token.path === "motion.ease.settle")) {
    failures.add("settle", "motion.ease.settle", "motion.json", "is missing");
  }
  for (const token of easings) {
    const curve = progressCurve(token.resolved as number[]);
    const peak = Math.max(...curve);
    const trough = Math.min(...curve);
    if (token.path !== "motion.ease.settle") {
      if (peak > 1 || trough < 0) {
        failures.add(
          "settle",
          token.path,
          token.file,
          "overshoots; only settle may"
        );
      }
      continue;
    }
    const overshoot = peak - 1;
    const afterPeak = curve.slice(curve.indexOf(peak));
    const swingsBack = afterPeak.some(
      (y, index) => index > 0 && y > afterPeak[index - 1]! + 1e-9
    );
    if (overshoot <= 0) {
      failures.add("settle", token.path, token.file, "doesn't overshoot");
    } else if (overshoot > maxOvershoot) {
      failures.add(
        "settle",
        token.path,
        token.file,
        `overshoots by ${(overshoot * 100).toFixed(1)}%, more than ${maxOvershoot * 100}%`
      );
    } else if (swingsBack || trough < 0) {
      failures.add("settle", token.path, token.file, "swings more than once");
    }
  }
}

function checkElevation(tokens: Resolved[], failures: Failures) {
  for (const token of tokens) {
    if (token.type !== "shadow") continue;
    for (const { color } of layers(token)) {
      if (color.components[1] > neutralChroma) {
        failures.add(
          "neutral-elevation",
          token.path,
          token.file,
          `casts ${cssColor(color)}; a shadow is neutral, never a glow`
        );
      }
    }
  }
}

function checkFonts(tokens: Resolved[], failures: Failures) {
  for (const token of tokens) {
    // An alias is checked once, where the family is written.
    const written =
      token.type === "fontFamily"
        ? token.value
        : token.type === "typography"
          ? (token.value as Record<string, unknown>).fontFamily
          : undefined;
    if (
      written === undefined ||
      (typeof written === "string" && written.startsWith("{"))
    ) {
      continue;
    }
    const family =
      token.type === "fontFamily"
        ? token.resolved
        : (token.resolved as Typography).fontFamily;
    for (const name of [family as string | string[]].flat()) {
      const banned = bannedFonts.find(
        (font) =>
          name.toLowerCase() === font.toLowerCase() ||
          name.toLowerCase().startsWith(`${font.toLowerCase()} `)
      );
      if (banned) {
        failures.add(
          "banned-font",
          token.path,
          token.file,
          `uses ${name}, which the design brief bans`
        );
      }
    }
  }
}

function checkKeyframes(
  tokens: Resolved[],
  keyframes: string,
  failures: Failures
) {
  for (const token of tokens) {
    if (!token.path.startsWith("motion.animate.")) continue;
    const name = tokenNames(token.path).role!;
    if (!new RegExp(`@keyframes ${name}\\s*\\{`).test(keyframes)) {
      failures.add(
        "keyframes",
        token.path,
        token.file,
        `names @keyframes ${name}, which keyframes.css doesn't define`
      );
    }
  }
}

// ── CSS ───────────────────────────────────────────────────────────────────

const number = (value: number) => String(Number(value.toFixed(4)));
const px = ({ value }: Dimension) => `${number(value)}px`;
const ms = ({ value }: Duration) => `${number(value)}ms`;

function cssColor(value: ColorValue): string {
  const [l, c, h] = value.components.map(number);
  return value.alpha === undefined
    ? `oklch(${l} ${c} ${h})`
    : `oklch(${l} ${c} ${h} / ${number(value.alpha)})`;
}

function cssFontFamily(value: string | string[]): string {
  return [value]
    .flat()
    .map((name) => (/\s/.test(name) ? `"${name}"` : name))
    .join(", ");
}

const cssCubicBezier = (value: number[]) =>
  `cubic-bezier(${value.map(number).join(", ")})`;

/** The --ds-* declarations one token contributes; typography gives one per sub-value. */
function declarations(token: Resolved): [name: string, value: string][] {
  const { cssVar } = tokenNames(token.path);
  const value = token.resolved;
  switch (token.type) {
    case "color":
      return [[cssVar, cssColor(value as ColorValue)]];
    case "dimension":
      return [[cssVar, px(value as Dimension)]];
    case "duration":
      return [[cssVar, ms(value as Duration)]];
    case "cubicBezier":
      return [[cssVar, cssCubicBezier(value as number[])]];
    case "fontFamily":
      return [[cssVar, cssFontFamily(value as string | string[])]];
    case "fontWeight":
    case "number":
      return [[cssVar, number(value as number)]];
    case "shadow":
      return [
        [
          cssVar,
          layers(token)
            .map(
              (layer) =>
                `${layer.inset ? "inset " : ""}${px(layer.offsetX)} ${px(layer.offsetY)} ${px(layer.blur)} ${px(layer.spread)} ${cssColor(layer.color)}`
            )
            .join(", "),
        ],
      ];
    case "typography": {
      const type = value as Typography;
      // DTCG line height is a ratio; CSS gets whole pixels at the role's size.
      const lineHeight = Math.round(type.fontSize.value * type.lineHeight);
      // Weight stays a reference to one of the two shared weights (ADR 0007).
      const { fontWeight } = token.value as { fontWeight: unknown };
      return [
        [`${cssVar}-font-size`, px(type.fontSize)],
        [`${cssVar}-line-height`, `${lineHeight}px`],
        [`${cssVar}-letter-spacing`, px(type.letterSpacing)],
        [
          `${cssVar}-font-weight`,
          typeof fontWeight === "string"
            ? tokenNames(fontWeight.slice(1, -1)).codeSyntax
            : number(type.fontWeight),
        ],
      ];
    }
    case "transition": {
      const transition = value as Transition;
      const animation = token.extensions?.["design-demo"]?.animation;
      return [
        [
          cssVar,
          [
            tokenNames(token.path).role,
            ms(transition.duration),
            cssCubicBezier(transition.timingFunction),
            ms(transition.delay),
            animation?.iterations,
            animation?.fillMode,
          ]
            .filter((part) => part !== undefined)
            .join(" "),
        ],
      ];
    }
  }
}

/** What the closed @theme maps for one token, or the @utility it gets instead. */
function themeEntries(token: Token): string[] {
  const names = tokenNames(token.path);
  if (!names.className) return [];
  if (token.type === "typography") {
    return [
      `${names.themeKey}: var(${names.cssVar}-font-size);`,
      `${names.themeKey}--line-height: var(${names.cssVar}-line-height);`,
      `${names.themeKey}--letter-spacing: var(${names.cssVar}-letter-spacing);`,
      `${names.themeKey}--font-weight: var(${names.cssVar}-font-weight);`,
    ];
  }
  const entries = names.themeKey
    ? [`${names.themeKey}: ${names.codeSyntax};`]
    : [];
  if (names.className === "font-sans") {
    entries.push(`--default-font-family: ${names.codeSyntax};`);
  }
  return entries;
}

function utility(token: Token): string | undefined {
  const names = tokenNames(token.path);
  if (names.themeKey || !names.className) return undefined;
  const property = names.family === "delay" ? "delay" : "duration";
  return [
    `@utility ${names.className} {`,
    `  transition-${property}: ${names.codeSyntax};`,
    `  animation-${property}: ${names.codeSyntax};`,
    `}`,
  ].join("\n");
}

// The keyboard focus ring is one class: Tailwind's outline and ring widths
// take bare numbers, which token lint bans. Use it as `focus-visible:focus-ring`.
const focusRing = { width: "size.height.edge", color: "color.ring.focus" };

function focusRingUtility(): string {
  const width = tokenNames(focusRing.width).codeSyntax;
  return [
    "@utility focus-ring {",
    `  outline: ${width} solid ${tokenNames(focusRing.color).codeSyntax};`,
    `  outline-offset: ${width};`,
    "}",
  ].join("\n");
}

function block(selector: string, tokens: Resolved[]): string {
  const lines = tokens
    .flatMap(declarations)
    .map(([name, value]) => `  ${name}: ${value};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

function emitCss(files: Map<string, Resolved[]>, keyframes: string): string {
  const single = Object.entries(collections).filter(
    ([name, scope]) => !scope && name !== "primitives"
  );
  const multi = Object.entries(collections).filter(([, scope]) => scope);
  const themed = defaultFiles
    .filter((file) => file !== "primitives")
    .flatMap((file) => files.get(file)!);

  return [
    "/* Generated by tokens/build.ts from the DTCG sources beside it. Don't edit:",
    "   change a source and run `pnpm tokens` (ADR 0005). */",
    "",
    block(
      ":root",
      single.flatMap(([name]) => files.get(name)!)
    ),
    "",
    ...multi.flatMap(([name, scope]) =>
      scope!.modes.flatMap((mode, index) => [
        block(
          `${index === 0 ? ":root,\n" : ""}[${scope!.attribute}="${mode}"]`,
          files.get(`${name}.${mode}`)!
        ),
        "",
      ])
    ),
    "/* The closed theme: Tailwind's defaults are gone, and only these classes compile",
    "   (ADR 0002). Each maps to a mode-aware --ds-* variable. */",
    "@theme inline {",
    "  --*: initial;",
    ...themed.flatMap(themeEntries).map((line) => `  ${line}`),
    "}",
    "",
    "/* Bare-value families get named utilities. */",
    ...themed.flatMap((token) => utility(token) ?? []),
    focusRingUtility(),
    "",
    "/* tokens/keyframes.css, verbatim. */",
    "",
    keyframes.trimEnd(),
    "",
  ].join("\n");
}

// ── TypeScript ────────────────────────────────────────────────────────────

function emitTs(parsed: Map<string, Token[]>): string {
  const families = new Map<string, string[]>();
  for (const file of defaultFiles) {
    for (const token of parsed.get(file)!) {
      const { family, role } = tokenNames(token.path);
      if (!family || !role) continue;
      families.set(family, [...(families.get(family) ?? []), role]);
    }
  }
  const exports = [...families].map(([family, roles]) => {
    const type = family[0]!.toUpperCase() + family.slice(1);
    return [
      `export const ${family} = [${roles.map((role) => JSON.stringify(role)).join(", ")}] as const;`,
      `export type ${type} = (typeof ${family})[number];`,
    ].join("\n");
  });
  return [
    "// Generated by tokens/build.ts. Don't edit: change a source and run `pnpm tokens`.",
    "// Token names only, one tuple and union per family, for the registry's z.enum() (ADR 0005).",
    "",
    exports.join("\n\n"),
    "",
  ].join("\n");
}

// ── Figma ─────────────────────────────────────────────────────────────────

// The payload figma/sync-tokens.ts wraps into one Plugin API script (ADR 0007).
// Collections mirror the source files; z-index has nothing to bind in Figma.
const notInFigma = ["z"];

type Rgba = { r: number; g: number; b: number; a: number };
type FigmaValue =
  | number
  | string
  | Rgba
  | { alias: string }
  | {
      type: "CUSTOM_CUBIC_BEZIER";
      easingFunctionCubicBezier: Record<"x1" | "y1" | "x2" | "y2", number>;
    };
type FigmaVariable = {
  name: string;
  type: "COLOR" | "FLOAT" | "STRING" | "TIMING" | "EASING";
  /** Absent for TIMING and EASING, which throw on scopes. */
  scopes?: string[];
  /**
   * A --ds-* variable in tokens.css. The sync script derives its code syntax,
   * var(--ds-<name with / as ->), rather than carrying it (ADR 0007).
   */
  css?: true;
  valuesByMode: Record<string, FigmaValue>;
};
type ShadowField = "color" | "offsetX" | "offsetY" | "radius" | "spread";

export type FigmaPayload = {
  collections: {
    name: string;
    modes: string[];
    hidden: boolean;
    variables: FigmaVariable[];
  }[];
  textStyles: { name: string; bind: Record<string, string> }[];
  effectStyles: {
    name: string;
    effects: {
      type: "DROP_SHADOW" | "INNER_SHADOW";
      bind: Record<ShadowField, string>;
    }[];
  }[];
};

const title = (name: string) => name[0]!.toUpperCase() + name.slice(1);
const toRgb = converter("rgb");
/**
 * A colour channel, clamped to Figma's 0–1 and rounded to the 8-bit step the
 * browser paints: a capture binds a fill only when the values match (#59).
 */
const channel = (value: number) =>
  Number((Math.round(Math.min(1, Math.max(0, value)) * 255) / 255).toFixed(6));

function rgba(value: ColorValue): Rgba {
  const { r, g, b } = toRgb(oklch(value));
  return {
    r: channel(r),
    g: channel(g),
    b: channel(b),
    // Captures never bind alpha, so it keeps its authored precision.
    a: Number(Math.min(1, Math.max(0, value.alpha ?? 1)).toFixed(4)),
  };
}

/** A colour stays an alias where its source writes one, so roles alias Primitives. */
function figmaColor(written: unknown, resolved: ColorValue): FigmaValue {
  return typeof written === "string"
    ? { alias: tokenNames(written.slice(1, -1)).figma }
    : rgba(resolved);
}

// Each colour namespace maps to the Figma fills it may be picked for (ADR 0005).
const colorScopes: Record<string, string[]> = {
  bg: ["FRAME_FILL", "SHAPE_FILL"],
  text: ["TEXT_FILL"],
  border: ["STROKE_COLOR"],
  ring: ["STROKE_COLOR"],
};

function dimensionScopes(path: string): string[] {
  const [family, second] = path.split(".");
  if (family === "space" || second === "padding") return ["GAP"];
  if (family === "radius" || second === "radius") return ["CORNER_RADIUS"];
  return ["WIDTH_HEIGHT"];
}

// A typography token becomes the --ds-* sub-variables its CSS declares, plus a
// text style that binds them, its family, and one of the two shared weights.
const typographyFields: [
  field: string,
  suffix: string,
  scope: string,
  value: (type: Typography) => number,
][] = [
  ["fontSize", "font-size", "FONT_SIZE", (type) => type.fontSize.value],
  [
    "lineHeight",
    "line-height",
    "LINE_HEIGHT",
    // Whole pixels at the role's size, as the CSS declares it.
    (type) => Math.round(type.fontSize.value * type.lineHeight),
  ],
  [
    "letterSpacing",
    "letter-spacing",
    "LETTER_SPACING",
    (type) => type.letterSpacing.value,
  ],
];

/** A shadow layer's Figma field, the DTCG field it comes from, and its variable's name. */
const shadowFields: [
  field: ShadowField,
  source: keyof ShadowLayer,
  suffix: string,
][] = [
  ["color", "color", "color"],
  ["offsetX", "offsetX", "offset-x"],
  ["offsetY", "offsetY", "offset-y"],
  ["radius", "blur", "blur"],
  ["spread", "spread", "spread"],
];
const emptyLayer: ShadowLayer = {
  color: { colorSpace: "oklch", components: [0, 0, 0], alpha: 0 },
  offsetX: { value: 0, unit: "px" },
  offsetY: { value: 0, unit: "px" },
  blur: { value: 0, unit: "px" },
  spread: { value: 0, unit: "px" },
};

function emitFigma(
  files: Map<string, Resolved[]>,
  failures: Failures
): FigmaPayload {
  const payload: FigmaPayload = {
    collections: [],
    textStyles: [],
    effectStyles: [],
  };
  for (const [name, scope] of Object.entries(collections)) {
    if (notInFigma.includes(name)) continue;
    const modes = scope?.modes ?? [];
    const modeNames = scope ? modes.map(title) : ["Value"];
    const byMode = (
      scope ? modes.map((mode) => `${name}.${mode}`) : [name]
    ).map(
      (file) => new Map(files.get(file)!.map((token) => [token.path, token]))
    );
    const variables: FigmaVariable[] = [];
    const variable = (
      figma: string,
      type: FigmaVariable["type"],
      scopes: string[] | undefined,
      cssVar: string | undefined,
      value: (token: Resolved) => FigmaValue,
      path: string
    ) => {
      // The derivation must name the variable tokens.css declares.
      if (cssVar && cssVar !== `--ds-${figma.split("/").join("-")}`) {
        throw new Error(`${figma} can't derive its code syntax ${cssVar}`);
      }
      variables.push({
        name: figma,
        type,
        ...(scopes && { scopes }),
        ...(cssVar && { css: true as const }),
        valuesByMode: Object.fromEntries(
          byMode.map((tokens, index) => [
            modeNames[index]!,
            value(tokens.get(path)!),
          ])
        ),
      });
    };

    for (const token of byMode[0]!.values()) {
      const names = tokenNames(token.path);
      // Primitives only feed aliases: no code syntax, and no picker scopes.
      const cssVar = name === "primitives" ? undefined : names.cssVar;
      switch (token.type) {
        case "color": {
          const scopes =
            name === "primitives"
              ? []
              : (colorScopes[token.path.split(".")[1]!] ?? ["ALL_FILLS"]);
          variable(
            names.figma,
            "COLOR",
            scopes,
            cssVar,
            (t) => figmaColor(t.value, t.resolved as ColorValue),
            token.path
          );
          break;
        }
        case "dimension":
          variable(
            names.figma,
            "FLOAT",
            dimensionScopes(token.path),
            cssVar,
            (t) => (t.resolved as Dimension).value,
            token.path
          );
          break;
        case "fontFamily":
          // Figma takes one family; the rest of the stack is CSS fallback.
          variable(
            names.figma,
            "STRING",
            ["FONT_FAMILY"],
            cssVar,
            (t) => [t.resolved as string | string[]].flat()[0]!,
            token.path
          );
          break;
        case "fontWeight":
          variable(
            names.figma,
            "FLOAT",
            ["FONT_WEIGHT"],
            cssVar,
            (t) => t.resolved as number,
            token.path
          );
          break;
        case "duration":
          variable(
            names.figma,
            "TIMING",
            undefined,
            cssVar,
            (t) => (t.resolved as Duration).value,
            token.path
          );
          break;
        case "cubicBezier":
          variable(
            names.figma,
            "EASING",
            undefined,
            cssVar,
            (t) => {
              const [x1, y1, x2, y2] = t.resolved as number[];
              return {
                type: "CUSTOM_CUBIC_BEZIER",
                easingFunctionCubicBezier: {
                  x1: x1!,
                  y1: y1!,
                  x2: x2!,
                  y2: y2!,
                },
              };
            },
            token.path
          );
          break;
        case "typography": {
          const bind: Record<string, string> = {};
          for (const field of ["fontFamily", "fontWeight"] as const) {
            // Bound straight to a shared variable, so it can't vary by mode.
            const written = new Set(
              byMode.map(
                (tokens) =>
                  (tokens.get(token.path)!.value as Record<string, unknown>)[
                    field
                  ]
              )
            );
            const [alias] = written;
            if (
              written.size !== 1 ||
              typeof alias !== "string" ||
              !alias.startsWith("{")
            ) {
              failures.add(
                "figma",
                token.path,
                token.file,
                `needs its ${field} to be one alias in every mode, so its Figma text style can bind it`
              );
              continue;
            }
            bind[field] = tokenNames(alias.slice(1, -1)).figma;
          }
          for (const [field, suffix, scope, value] of typographyFields) {
            const figma = `${names.figma}/${suffix}`;
            variable(
              figma,
              "FLOAT",
              [scope],
              `${names.cssVar}-${suffix}`,
              (t) => value(t.resolved as Typography),
              token.path
            );
            bind[field] = figma;
          }
          payload.textStyles.push({ name: names.role!, bind });
          break;
        }
        case "shadow": {
          // Every theme pads to the same layer count with empty layers, so
          // one effect style's fields can bind each theme's values.
          const themes = byMode.map((tokens) =>
            layers(tokens.get(token.path)!)
          );
          const count = Math.max(...themes.map((list) => list.length));
          const effects: FigmaPayload["effectStyles"][number]["effects"] = [];
          for (let index = 0; index < count; index++) {
            const insets = new Set(
              themes.flatMap((list) =>
                list[index] ? [Boolean(list[index]!.inset)] : []
              )
            );
            if (insets.size > 1) {
              failures.add(
                "figma",
                token.path,
                token.file,
                `is inset in one theme but not another at layer ${index + 1}; a Figma effect can't change type by mode`
              );
            }
            const bind = {} as Record<ShadowField, string>;
            for (const [field, source, suffix] of shadowFields) {
              const figma = `${names.figma}/${index + 1}/${suffix}`;
              const at = (t: Resolved) => {
                // A whole-shadow alias has no written layers of its own.
                const written =
                  typeof t.value === "string"
                    ? []
                    : [t.value as ShadowLayer | ShadowLayer[]].flat();
                return {
                  written: written[index],
                  resolved: layers(t)[index] ?? emptyLayer,
                };
              };
              if (field === "color") {
                variable(
                  figma,
                  "COLOR",
                  ["EFFECT_COLOR"],
                  undefined,
                  (t) => {
                    const { written, resolved } = at(t);
                    return figmaColor(written?.color, resolved.color);
                  },
                  token.path
                );
              } else {
                variable(
                  figma,
                  "FLOAT",
                  ["EFFECT_FLOAT"],
                  undefined,
                  (t) => (at(t).resolved[source] as Dimension).value,
                  token.path
                );
              }
              bind[field] = figma;
            }
            effects.push({
              type: insets.has(true) ? "INNER_SHADOW" : "DROP_SHADOW",
              bind,
            });
          }
          payload.effectStyles.push({ name: names.figma, effects });
          break;
        }
        // A transition names a CSS keyframe, which Figma can't carry.
        case "transition":
        case "number":
          break;
      }
    }
    payload.collections.push({
      name: title(name),
      modes: modeNames,
      hidden: name === "primitives",
      variables,
    });
  }
  return payload;
}

// ── CLI ───────────────────────────────────────────────────────────────────

/** The build's JSON output, which sits among the sources but isn't one. */
export const figmaPayloadFile = "figma.json";

export async function readSources(dir: string): Promise<Sources> {
  const files: Record<string, unknown> = {};
  for (const entry of (await readdir(dir)).sort()) {
    if (!entry.endsWith(".json") || entry === figmaPayloadFile) continue;
    files[entry.slice(0, -".json".length)] = JSON.parse(
      await readFile(join(dir, entry), "utf8")
    );
  }
  return {
    files,
    keyframes: await readFile(join(dir, "keyframes.css"), "utf8"),
  };
}

async function main(args: string[]): Promise<number> {
  const option = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const here = fileURLToPath(new URL(".", import.meta.url));
  const source = option("--source") ?? here;
  const out = option("--out") ?? here;

  const result = build(await readSources(source));
  if (!result.ok) {
    for (const { check, path, file, message } of result.failures) {
      console.error(
        `tokens: [${check}] ${path || "(file)"} in ${file} ${message}`
      );
    }
    return 1;
  }
  await writeFile(join(out, "tokens.css"), result.css);
  await writeFile(join(out, "tokens.ts"), result.ts);
  await writeFile(join(out, figmaPayloadFile), result.figma);
  console.log(
    `tokens: wrote tokens.css, tokens.ts and ${figmaPayloadFile} to ${out}`
  );
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
