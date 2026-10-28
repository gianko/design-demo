import { readFile } from "node:fs/promises";
import { compile } from "tailwindcss";
import { beforeAll, describe, expect, it } from "vitest";
import { build, readSources, type Built, type FigmaPayload } from "./build.ts";
import { tokenNames } from "./naming.ts";

const tokensDir = `${import.meta.dirname}/`;

let built: Built;

beforeAll(async () => {
  const result = build(await readSources(tokensDir));
  if (!result.ok) throw new Error(JSON.stringify(result.failures, null, 2));
  built = result;
});

it("builds tokens.css, tokens.ts and the Figma payload from the committed sources", () => {
  expect(built.css).toMatchSnapshot();
  expect(built.ts).toMatchSnapshot();
  expect(built.figma).toMatchSnapshot();
});

it("leaves the committed outputs as a fresh build writes them", async () => {
  expect(await readFile(`${tokensDir}tokens.css`, "utf8")).toBe(built.css);
  expect(await readFile(`${tokensDir}tokens.ts`, "utf8")).toBe(built.ts);
  expect(await readFile(`${tokensDir}figma.json`, "utf8")).toBe(built.figma);
});

// Hover and pressed are translucent ink, so one pair shows on every surface
// level: they darken what's under them in light and lighten it in dark
// (#250). The token validation holds each composite a visible step apart.
it.each(["light", "dark"])(
  "makes %s's hover and pressed the theme's ink at a low alpha, pressed stronger",
  (theme) => {
    const block = blockOf(built.css, `[data-theme="${theme}"]`);
    // Each colour's authored oklch(), from the comment beside its rgb().
    const value = (name: string) =>
      block.match(
        new RegExp(`--ds-color-${name}: [^;]*; /\\* (oklch\\([^)]*\\)) \\*/`)
      )?.[1];
    const ink = value("text-ink")!.match(/^oklch\(([^)]*)\)$/)![1];
    const translucent = (role: string) => {
      const [, components, alpha] =
        value(`bg-${role}`)!.match(/^oklch\((.*) \/ ([0-9.]+)\)$/) ?? [];
      return { components, alpha: Number(alpha) };
    };

    const hover = translucent("surface-hover");
    const pressed = translucent("surface-pressed");
    expect([hover.components, pressed.components]).toEqual([ink, ink]);
    expect(hover.alpha).toBeGreaterThan(0);
    expect(pressed.alpha).toBeGreaterThan(hover.alpha);
    expect(pressed.alpha).toBeLessThanOrEqual(0.15);
  }
);

// The brief's overlay level (a sheet, a modal, a menu) floats above the raised
// bars and toasts, and in dark, levels are lighter surfaces (#252).
describe("the overlay surface", () => {
  it("is lighter than surface-raised in dark", () => {
    const dark = blockOf(built.css, '[data-theme="dark"]');
    const lightness = (role: string) =>
      Number(
        dark.match(
          new RegExp(`--ds-color-bg-${role}: [^;]*; /\\* oklch\\(([0-9.]+) `)
        )?.[1]
      );

    expect(lightness("surface-overlay")).toBeGreaterThan(
      lightness("surface-raised")
    );
  });

  // So text and edges are checked on the overlay as on raised, in both themes.
  it.each(["color.light", "color.dark"])(
    "is a background in every contrast annotation of %s that lists surface-raised",
    async (file) => {
      const { files } = await readSources(tokensDir);
      const missing: string[] = [];
      const walk = (node: unknown, path: string[]) => {
        if (typeof node !== "object" || node === null) return;
        const against = (
          node as {
            $extensions?: {
              "design-demo"?: { contrast?: { against: string[] } };
            };
          }
        ).$extensions?.["design-demo"]?.contrast?.against;
        if (
          against?.includes("{color.bg.surface-raised}") &&
          !against.includes("{color.bg.surface-overlay}")
        ) {
          missing.push(path.join("."));
        }
        for (const [key, child] of Object.entries(node)) {
          if (!key.startsWith("$")) walk(child, [...path, key]);
        }
      };
      walk(files[file], []);

      expect(missing).toEqual([]);
    }
  );
});

describe("the naming chain", () => {
  // One token per family, as ADR 0005 spells the chain out.
  const examples: [path: string, mode: string][] = [
    ["color.bg.surface", '[data-theme="dark"]'],
    ["color.text.ink-muted", '[data-theme="dark"]'],
    ["color.border.control", '[data-theme="dark"]'],
    ["color.ring.focus", '[data-theme="dark"]'],
    ["color.bg.surface-overlay", '[data-theme="light"]'],
    ["shadow.raised", '[data-theme="dark"]'],
    ["space.sm", ":root"],
    ["radius.control", ":root"],
    ["density.padding.page", '[data-density="contractor"]'],
    ["density.padding.surface", '[data-density="contractor"]'],
    ["density.height.control", '[data-density="contractor"]'],
    ["density.min-height.target", '[data-density="contractor"]'],
    ["density.max-width.measure", '[data-density="contractor"]'],
    ["density.size.icon", '[data-density="contractor"]'],
    ["density.radius.surface", '[data-density="contractor"]'],
    ["density.text.body", '[data-density="contractor"]'],
    ["size.width.sheet", ":root"],
    ["size.max-width.card", ":root"],
    ["type.title", ":root"],
    ["type.family.sans", ":root"],
    ["motion.duration.base", ":root"],
    ["motion.delay.stagger", ":root"],
    ["motion.ease.settle", ":root"],
    ["motion.animate.progress-fill", ":root"],
    ["z.toast", ":root"],
  ];

  let utilities: (className: string) => string;

  beforeAll(async () => {
    const compiler = await compile(`${built.css}\n@tailwind utilities;`, {
      base: tokensDir,
    });
    utilities = (className) => compiler.build([className]);
  });

  it.each(examples)("holds for %s", (path, mode) => {
    const names = tokenNames(path);
    // Typography is one token with a --ds-* variable per sub-value.
    const cssVar =
      names.family === "text" ? `${names.cssVar}-font-size` : names.cssVar;

    expect(blockOf(built.css, mode)).toContain(`${cssVar}:`);
    expect(utilities(names.className!)).toContain(`var(${cssVar})`);
    expect(built.ts).toMatch(
      new RegExp(`export const ${names.family} = \\[[^\\]]*"${names.role}"`)
    );
  });

  it("keeps font weight as one of two shared variables (ADR 0007)", () => {
    expect(blockOf(built.css, ":root")).toContain(
      "--ds-type-title-font-weight: var(--ds-type-weight-semibold);"
    );
    expect(blockOf(built.css, '[data-density="contractor"]')).toContain(
      "--ds-density-text-body-font-weight: var(--ds-type-weight-regular);"
    );
  });

  // The brief's table header style: the body size at weight 600 (#185).
  it("gives column headers the body's size at weight 600 in each density mode", () => {
    const admin = blockOf(built.css, '[data-density="admin"]');
    const contractor = blockOf(built.css, '[data-density="contractor"]');

    expect(admin).toContain("--ds-density-text-column-header-font-size: 14px;");
    expect(contractor).toContain(
      "--ds-density-text-column-header-font-size: 16px;"
    );
    expect(contractor).toContain(
      "--ds-density-text-column-header-font-weight: var(--ds-type-weight-semibold);"
    );
    expect(built.css).not.toMatch(/--ds-type-column-header/);
    expect(utilities("text-column-header")).toContain(
      "font-size: var(--ds-density-text-column-header-font-size);"
    );
  });

  // A capture binds a property only through a plain var(--ds-*); behind
  // Tailwind's --tw-leading or --tw-tracking it binds by value and can land
  // on another role (#104).
  it.each([
    "type.caption",
    "density.text.label",
    "density.text.column-header",
    "density.text.body",
    "type.heading",
    "type.title",
    "type.figure",
  ])(
    "compiles %s's class once, with its own line height and tracking as plain variables",
    (path) => {
      const { className, cssVar } = tokenNames(path);
      const css = utilities(className!);

      expect(css.match(new RegExp(`\\.${className}\\s*\\{`, "g"))).toHaveLength(
        1
      );
      expect(css).toContain(`line-height: var(${cssVar}-line-height);`);
      expect(css).toContain(`letter-spacing: var(${cssVar}-letter-spacing);`);
      expect(css).not.toContain("--tw-leading");
      expect(css).not.toContain("--tw-tracking");
    }
  );

  it("draws the keyboard focus ring from the edge and focus tokens", () => {
    const css = utilities("focus-visible:focus-ring");

    expect(css).toContain(":focus-visible");
    expect(css).toContain(
      "outline: var(--ds-size-height-edge) solid var(--ds-color-ring-focus)"
    );
    expect(css).toContain("outline-offset: var(--ds-size-height-edge)");
  });

  // A failure Toast's pair (#241), compiled like a status pair.
  it("compiles the error pair's background and text classes", () => {
    expect(utilities("bg-error")).toContain(
      "background-color: var(--ds-color-bg-error)"
    );
    expect(utilities("text-error")).toContain(
      "color: var(--ds-color-text-error)"
    );
  });

  it("compiles nothing outside the tokens", () => {
    for (const className of [
      "bg-ink",
      "text-page",
      "p-4",
      "rounded-lg",
      "font-bold",
    ]) {
      expect(utilities(className)).not.toContain(`.${className}`);
    }
  });
});

describe("the Figma payload", () => {
  let payload: FigmaPayload;
  const variable = (collection: string, name: string) =>
    payload.collections
      .find((c) => c.name === collection)!
      .variables.find((v) => v.name === name)!;

  beforeAll(() => {
    payload = JSON.parse(built.figma);
  });

  it("mirrors the mode axes as collections, without z-index", () => {
    expect(
      payload.collections.map(({ name, modes, hidden }) => [
        name,
        modes,
        hidden,
      ])
    ).toEqual([
      ["Primitives", ["Value"], true],
      ["Color", ["Light", "Dark"], false],
      ["Density", ["Admin", "Contractor"], false],
      ["Space", ["Value"], false],
      ["Size", ["Value"], false],
      ["Radius", ["Value"], false],
      ["Type", ["Value"], false],
      ["Motion", ["Value"], false],
    ]);
  });

  it("aliases a colour role to its primitive in each theme, marked as a --ds-* variable", () => {
    expect(variable("Color", "color/text/ink-muted")).toEqual({
      name: "color/text/ink-muted",
      type: "COLOR",
      scopes: ["TEXT_FILL"],
      css: true,
      valuesByMode: {
        Light: { alias: "primitive/neutral/500" },
        Dark: { alias: "primitive/neutral/740" },
      },
    });
    expect(variable("Primitives", "primitive/neutral/740")).toMatchObject({
      scopes: [],
    });
    expect(variable("Primitives", "primitive/neutral/740")).not.toHaveProperty(
      "css"
    );
  });

  // The sync script derives code syntax as var(--ds-<name, / as ->), so a
  // marked variable must be one tokens.css declares, and an unmarked one not.
  it("marks exactly the variables whose derived --ds-* name tokens.css declares", () => {
    const declared = new Set(
      [...built.css.matchAll(/^\s+(--ds-[\w-]+):/gm)].map(([, name]) => name)
    );
    const derived = (name: string) => `--ds-${name.split("/").join("-")}`;
    const variables = payload.collections.flatMap((c) => c.variables);

    expect(
      variables.filter((v) => v.css && !declared.has(derived(v.name)))
    ).toEqual([]);
    expect(
      variables.filter((v) => !v.css && declared.has(derived(v.name)))
    ).toEqual([]);
    expect(variables.filter((v) => v.css)).toHaveLength(96);
  });

  // ADR 0001 lists container padding among what density changes.
  it("pads a surface by density: 20px admin, 24px contractor", () => {
    expect(variable("Density", "density/padding/surface")).toMatchObject({
      type: "FLOAT",
      scopes: ["GAP"],
      css: true,
      valuesByMode: { Admin: 20, Contractor: 24 },
    });
  });

  // One value for both densities: ADR 0001's list doesn't include width.
  it("caps a Card's width at 560px, as a size and not a density", () => {
    expect(variable("Size", "size/max-width/card")).toMatchObject({
      type: "FLOAT",
      scopes: ["WIDTH_HEIGHT"],
      css: true,
      valuesByMode: { Value: 560 },
    });
  });

  // A disabled secondary keeps its edge (#145): its own role, though it
  // shares line's values today.
  it("gives a disabled bordered control its own edge role in each theme", () => {
    expect(variable("Color", "color/border/disabled")).toEqual({
      name: "color/border/disabled",
      type: "COLOR",
      scopes: ["STROKE_COLOR"],
      css: true,
      valuesByMode: {
        Light: { alias: "primitive/neutral/900" },
        Dark: { alias: "primitive/neutral/360" },
      },
    });
  });

  // A failure Toast's own pair (#241), so the status tags keep their colours
  // to themselves: a calm red surface and its ink in each theme, neither the
  // value of any status pair's background or text in that theme.
  it("gives a failure its own error pair in each theme, apart from the status pairs", () => {
    expect(variable("Color", "color/bg/error")).toEqual({
      name: "color/bg/error",
      type: "COLOR",
      scopes: ["FRAME_FILL", "SHAPE_FILL"],
      css: true,
      valuesByMode: {
        Light: { alias: "primitive/red/820" },
        Dark: { alias: "primitive/red/480" },
      },
    });
    expect(variable("Color", "color/text/error")).toEqual({
      name: "color/text/error",
      type: "COLOR",
      scopes: ["TEXT_FILL"],
      css: true,
      valuesByMode: {
        Light: { alias: "primitive/red/320" },
        Dark: { alias: "primitive/red/940" },
      },
    });
    const statuses = ["awaiting", "overdue", "paid", "scheduled", "failed"];
    for (const mode of ["Light", "Dark"] as const) {
      const status = statuses.flatMap((role) =>
        ["bg", "text"].map(
          (family) =>
            variable("Color", `color/${family}/${role}`).valuesByMode[mode]
        )
      );
      for (const family of ["bg", "text"]) {
        expect(status).not.toContainEqual(
          variable("Color", `color/${family}/error`).valuesByMode[mode]
        );
      }
    }
  });

  // The token validation checks a pair's text only where an annotation asks
  // it to, so each status pair's and the error pair's text names its own
  // background at 4.5:1, in each theme.
  it.each(["color.light", "color.dark"])(
    "annotates each status and error pair's text at 4.5:1 on its background in %s",
    async (file) => {
      const { files } = await readSources(tokensDir);
      const text = (
        files[file] as {
          color: {
            text: Record<
              string,
              {
                $extensions?: {
                  "design-demo"?: {
                    contrast?: { min: number; against: string[] };
                  };
                };
              }
            >;
          };
        }
      ).color.text;
      const pairs = ["awaiting", "overdue", "paid", "scheduled", "failed"];
      for (const role of [...pairs, "error"]) {
        const contrast = text[role]?.$extensions?.["design-demo"]?.contrast;
        expect(contrast?.min, role).toBeGreaterThanOrEqual(4.5);
        expect(contrast?.against, role).toContain(`{color.bg.${role}}`);
      }
    }
  );

  // About 65 characters of body copy at each density's body size (#95); 65ch
  // would hold about 96, as Instrument Sans's "0" is wide.
  it("bounds a line of body copy by density: 412px admin, 472px contractor", () => {
    expect(variable("Density", "density/max-width/measure")).toMatchObject({
      type: "FLOAT",
      scopes: ["WIDTH_HEIGHT"],
      css: true,
      valuesByMode: { Admin: 412, Contractor: 472 },
    });
  });

  it("converts a literal colour to sRGB 0–1 and keeps its alpha", () => {
    const { Light, Dark } = variable("Color", "color/bg/scrim").valuesByMode;

    expect(Dark).toEqual({
      r: expect.any(Number),
      g: expect.any(Number),
      b: expect.any(Number),
      a: 0.6,
    });
    expect(Light).toMatchObject({ a: 0.4 });
  });

  it("carries the overlay surface in both modes, as surface-raised is (#252)", () => {
    expect(variable("Color", "color/bg/surface-overlay")).toMatchObject({
      type: "COLOR",
      scopes: variable("Color", "color/bg/surface-raised").scopes,
      css: true,
      valuesByMode: {
        Light: { alias: expect.stringMatching(/^primitive\/neutral\//) },
        Dark: { alias: expect.stringMatching(/^primitive\/neutral\//) },
      },
    });
  });

  // Figma colour variables carry alpha, so a hover fill drawn in Figma is
  // the same translucent ink as in code (#250).
  it.each(["surface-hover", "surface-pressed"])(
    "gives %s its alpha in both modes",
    (role) => {
      const { valuesByMode } = variable("Color", `color/bg/${role}`);

      for (const mode of ["Light", "Dark"]) {
        expect(valuesByMode[mode]).toMatchObject({
          a: expect.toSatisfy((a: number) => a > 0 && a < 1),
        });
      }
    }
  );

  // A capture binds a fill only when Figma's value is the colour the browser
  // painted, so every channel sits on the 8-bit step the browser rounds to.
  it("gives each colour the 8-bit sRGB value the browser paints", () => {
    const eightBit = ({ r, g, b }: { r: number; g: number; b: number }) =>
      [r, g, b].map((channel) => Math.round(channel * 255));
    // Dark's page: oklch(0.19 0.018 330) paints 24,17,24; red is 24.496.
    const page = variable("Primitives", "primitive/neutral/190").valuesByMode
      .Value as { r: number; g: number; b: number };
    expect(eightBit(page)).toEqual([24, 17, 24]);

    const channels = payload.collections
      .flatMap(({ variables }) => variables)
      .filter(({ type }) => type === "COLOR")
      .flatMap(({ valuesByMode }) => Object.values(valuesByMode))
      .filter((value) => typeof value === "object" && "r" in value)
      .flatMap(({ r, g, b }) => [r, g, b] as number[]);
    for (const channel of channels) {
      expect(Math.abs(channel * 255 - Math.round(channel * 255))).toBeLessThan(
        1e-3
      );
    }
  });

  // Each sits within 0.05 of a rounding boundary in one channel (247.513,
  // 132.491, 22.533), where Chrome's and Figma's converters disagreed on
  // oklch() (#273, #285). With rgb() in tokens.css no converter runs, so
  // these are culori's sRGB rounded, as #285's triage records them.
  it.each([
    ["Light", "color/bg/surface-raised", [248, 244, 247]],
    ["Light", "color/text/disabled", [134, 125, 132]],
    ["Light", "color/text/scheduled", [23, 93, 155]],
  ] as const)(
    "gives %s %s its sRGB rounded to the nearest 8-bit step",
    (mode, role, expected) => {
      const { alias } = variable("Color", role).valuesByMode[mode] as {
        alias: string;
      };
      const { r, g, b } = variable("Primitives", alias).valuesByMode.Value as {
        r: number;
        g: number;
        b: number;
      };

      expect([r, g, b].map((channel) => Math.round(channel * 255))).toEqual(
        expected
      );
    }
  );

  // Figma's capture reads a colour as the string the browser computes and
  // converts it itself, so CSS and Figma carry the same 8-bit rgb() and no
  // converter runs between them (#285).
  it.each(["Light", "Dark"])(
    "declares each %s colour in tokens.css as the rgb() Figma gets, with its oklch beside it",
    (mode) => {
      const block = blockOf(built.css, `[data-theme="${mode.toLowerCase()}"]`);
      const rgb = (name: string) => {
        let value = variable("Color", name).valuesByMode[mode];
        while (typeof value === "object" && "alias" in value) {
          value = variable("Primitives", value.alias).valuesByMode.Value;
        }
        const { r, g, b, a } = value as Record<"r" | "g" | "b" | "a", number>;
        const channels = [r, g, b].map((c) => Math.round(c * 255)).join(" ");
        return a === 1 ? `rgb(${channels})` : `rgb(${channels} / ${a})`;
      };
      const roles = payload.collections
        .find((c) => c.name === "Color")!
        .variables.filter((v) => v.type === "COLOR" && v.css);

      expect(roles.length).toBeGreaterThan(30);
      for (const { name } of roles) {
        expect(block).toMatch(
          new RegExp(
            `--ds-${name.split("/").join("-")}: ${escape(rgb(name))}; /\\* oklch\\([^)]*\\) \\*/\n`
          )
        );
      }
      for (const { name, effects } of payload.effectStyles) {
        const declared = block.match(
          new RegExp(`--ds-${name.split("/").join("-")}: ([^;]*);`)
        )![1]!;
        const colours = effects
          .map(({ bind }) => rgb(bind.color))
          // An empty padding layer isn't declared in CSS.
          .filter((colour) => colour !== "rgb(0 0 0 / 0)");
        expect(declared.match(/rgb\([^)]*\)/g)).toEqual(colours);
      }
      expect(block.replace(/\/\*.*?\*\//g, "")).not.toContain("oklch(");
    }
  );

  it("pads each theme's shadow to the same layer count and binds every field", () => {
    const raised = payload.effectStyles.find(
      (s) => s.name === "shadow/raised"
    )!;

    expect(raised.effects).toHaveLength(2);
    expect(raised.effects[1]).toEqual({
      type: "DROP_SHADOW",
      bind: {
        color: "shadow/raised/2/color",
        offsetX: "shadow/raised/2/offset-x",
        offsetY: "shadow/raised/2/offset-y",
        radius: "shadow/raised/2/blur",
        spread: "shadow/raised/2/spread",
      },
    });
    // Dark's raised level is one ring, so its second layer is empty.
    expect(variable("Color", "shadow/raised/2/blur").valuesByMode).toEqual({
      Light: 12,
      Dark: 0,
    });
    expect(
      variable("Color", "shadow/raised/2/color").valuesByMode.Dark
    ).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(variable("Color", "shadow/raised/1/spread").valuesByMode).toEqual({
      Light: 0,
      Dark: 1,
    });
  });

  it("binds a text style to its density sub-variables and a shared weight", () => {
    expect(payload.textStyles.find((s) => s.name === "body")).toEqual({
      name: "body",
      bind: {
        fontFamily: "type/family/sans",
        fontWeight: "type/weight/regular",
        fontSize: "density/text/body/font-size",
        lineHeight: "density/text/body/line-height",
        letterSpacing: "density/text/body/letter-spacing",
      },
    });
    expect(
      variable("Density", "density/text/body/font-size").valuesByMode
    ).toEqual({ Admin: 14, Contractor: 16 });
    expect(variable("Type", "type/title/letter-spacing")).toMatchObject({
      scopes: ["LETTER_SPACING"],
      css: true,
      valuesByMode: { Value: -0.36 },
    });
    expect(variable("Type", "type/family/sans").valuesByMode).toEqual({
      Value: "Instrument Sans",
    });
  });

  it("gives motion TIMING and EASING variables without scopes, and no keyframe animations", () => {
    const motion = payload.collections.find((c) => c.name === "Motion")!;

    expect(variable("Motion", "motion/ease/settle")).toEqual({
      name: "motion/ease/settle",
      type: "EASING",
      css: true,
      valuesByMode: {
        Value: {
          type: "CUSTOM_CUBIC_BEZIER",
          easingFunctionCubicBezier: { x1: 0.3, y1: 1.3, x2: 0.6, y2: 1.02 },
        },
      },
    });
    expect(variable("Motion", "motion/delay/stagger")).toMatchObject({
      type: "TIMING",
      valuesByMode: { Value: 40 },
    });
    expect(motion.variables.some((v) => "scopes" in v)).toBe(false);
    expect(
      motion.variables.some((v) => v.name.startsWith("motion/animate"))
    ).toBe(false);
  });
});

const escape = (text: string) => text.replace(/[()/.]/g, "\\$&");

function blockOf(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `no ${selector} block`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}
