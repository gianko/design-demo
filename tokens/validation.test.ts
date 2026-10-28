import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, expect, it } from "vitest";
import {
  build,
  paintedFile,
  readSources,
  type Check,
  type Sources,
} from "./build.ts";

const run = promisify(execFile);
const tokensDir = import.meta.dirname;
const dirs: string[] = [];

let sources: Sources;

beforeAll(async () => {
  sources = await readSources(tokensDir);
});

afterAll(async () => {
  await Promise.all(
    dirs.map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

// Fixtures reach into the parsed JSON by hand, so its shape is left untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Files = Record<string, any>;

/** Runs `pnpm tokens`' script on a copy of the sources, changed by `edit`. */
async function tokens(edit: (files: Files, sources: Sources) => void) {
  const copy: Sources = structuredClone(sources);
  edit(copy.files, copy);
  const dir = await mkdtemp(join(tmpdir(), "tokens-"));
  dirs.push(dir);
  await Promise.all([
    ...Object.entries(copy.files).map(([file, json]) =>
      writeFile(join(dir, `${file}.json`), JSON.stringify(json))
    ),
    writeFile(join(dir, "keyframes.css"), copy.keyframes),
    writeFile(join(dir, paintedFile), JSON.stringify(copy.painted)),
  ]);
  try {
    const { stdout } = await run("node", [
      join(tokensDir, "build.ts"),
      "--source",
      dir,
      "--out",
      dir,
    ]);
    return { code: 0, output: stdout, dir };
  } catch (error) {
    const { code, stderr } = error as { code: number; stderr: string };
    return { code, output: stderr, dir };
  }
}

it("writes every output and exits 0 on the committed sources", async () => {
  const { code, dir } = await tokens(() => {});
  const built = build(sources);

  expect(code).toBe(0);
  expect(built.ok && built.css).toBe(
    await readFile(join(dir, "tokens.css"), "utf8")
  );
  expect(built.ok && built.ts).toBe(
    await readFile(join(dir, "tokens.ts"), "utf8")
  );
  expect(built.ok && built.figma).toBe(
    await readFile(join(dir, "figma.json"), "utf8")
  );
});

// Dark's ink, as a translucent fill.
const darkInkAt = (alpha: number) => ({
  colorSpace: "oklch",
  components: [0.94, 0.01, 330],
  alpha,
});

// Light's ink, as a translucent fill.
const lightInkAt = (alpha: number) => ({
  colorSpace: "oklch",
  components: [0.27, 0.025, 330],
  alpha,
});

// One failing fixture per validation in spec § Token build. A fixture whose
// failure is about one place in particular names it in `where`.
const fixtures: [
  check: Check,
  path: string,
  edit: Parameters<typeof tokens>[0],
  where?: string,
][] = [
  [
    "schema",
    "color.bg.page",
    (files) => {
      files["color.light"].color.bg.page.$value = "#ffffff";
    },
  ],
  [
    "modes-match",
    "color.text.accent",
    (files) => {
      delete files["color.dark"].color.text.accent;
    },
  ],
  [
    "modes-match",
    "density.size.icon",
    (files) => {
      files["density.contractor"].density.size.icon = {
        $type: "number",
        $value: 20,
      };
    },
  ],
  [
    "unique-names",
    "radius.surface",
    (files) => {
      files.radius.radius.surface = { $value: { value: 8, unit: "px" } };
    },
  ],
  [
    "gamut",
    "primitive.green.840",
    (files) => {
      files.primitives.primitive.green["840"].$value.components = [
        0.84, 0.3, 155,
      ];
    },
  ],
  [
    "contrast",
    "color.text.ink-muted",
    (files) => {
      files["color.dark"].color.text["ink-muted"].$value =
        "{primitive.neutral.400}";
    },
  ],
  // Translucent: ink clears 4.5:1 on the pressed fill over page and surface,
  // and misses it only over surface-raised, the lightest surface in dark.
  [
    "contrast",
    "color.text.ink",
    (files) => {
      files["color.dark"].color.bg["surface-pressed"].$value = darkInkAt(0.35);
    },
    "on color.bg.surface-pressed over color.bg.surface-raised,",
  ],
  // Dark's hover as it was: opaque, and the same colour as surface-raised,
  // so it only vanishes on that one surface.
  [
    "lightness-step",
    "color.bg.surface-hover",
    (files) => {
      files["color.dark"].color.bg["surface-hover"].$value =
        "{primitive.neutral.270}";
    },
    "from color.bg.surface-raised over color.bg.surface-raised,",
  ],
  // Pressed is a clear step from every surface, but not from hover: light's
  // pressed at 10% over hover at 6%, about 0.025 from hover on each surface,
  // which a 0.02 minimum let through though #133 found a step under 0.03
  // hard to see.
  [
    "lightness-step",
    "color.bg.surface-pressed",
    (files) => {
      files["color.light"].color.bg["surface-hover"].$value = lightInkAt(0.06);
      files["color.light"].color.bg["surface-pressed"].$value = lightInkAt(0.1);
    },
    "from color.bg.surface-hover over",
  ],
  // A surface added later is checked too: hover over a near-ink surface.
  [
    "lightness-step",
    "color.bg.surface-hover",
    (files) => {
      files["color.light"].color.bg["surface-sunken"] = {
        $value: "{primitive.neutral.985}",
      };
      files["color.dark"].color.bg["surface-sunken"] = {
        $value: "{primitive.neutral.900}",
      };
    },
    "over color.bg.surface-sunken,",
  ],
  [
    "neutral-tint",
    "primitive.neutral.985",
    (files) => {
      files.primitives.primitive.neutral["985"].$value.components = [
        0.985, 0, 0,
      ];
    },
  ],
  [
    "neutral-tint",
    "shadow.overlay",
    (files) => {
      files["color.dark"].shadow.overlay.$value[1].color.components = [0, 0, 0];
    },
  ],
  [
    "settle",
    "motion.ease.settle",
    (files) => {
      files.motion.motion.ease.settle.$value = [0.3, 1.6, 0.6, 1];
    },
  ],
  [
    "settle",
    "motion.ease.settle",
    (files) => {
      files.motion.motion.ease.settle.$value = [0.3, 1.45, 0.6, 0.9];
    },
  ],
  [
    "settle",
    "motion.ease.standard",
    (files) => {
      files.motion.motion.ease.standard.$value = [0.2, 1.2, 0, 1];
    },
  ],
  [
    "neutral-elevation",
    "shadow.raised",
    (files) => {
      files["color.light"].shadow.raised.$value[0].color =
        "{primitive.heather.480}";
    },
  ],
  [
    "banned-font",
    "type.family.sans",
    (files) => {
      files.type.type.family.sans.$value = ["Inter", "sans-serif"];
    },
  ],
  [
    "keyframes",
    "motion.animate.progress-sweep",
    (_, copy) => {
      copy.keyframes = copy.keyframes.replace(
        "@keyframes progress-sweep",
        "@keyframes sweep"
      );
    },
  ],
  // A Figma text style binds weight to one shared variable in every mode.
  [
    "figma",
    "density.text.body",
    (files) => {
      files["density.contractor"].density.text.body.$value.fontWeight =
        "{type.weight.semibold}";
    },
  ],
  [
    "figma",
    "type.figure",
    (files) => {
      files.type.type.figure.$value.fontFamily = ["Instrument Sans"];
    },
  ],
  [
    "figma",
    "shadow.overlay",
    (files) => {
      files["color.dark"].shadow.overlay.$value[1].inset = true;
    },
  ],
  // A colour changed without a re-paint has no painted value for Figma (#273).
  [
    "painted",
    "primitive.neutral.970",
    (files) => {
      files.primitives.primitive.neutral["970"].$value.components = [
        0.971, 0.006, 330,
      ];
    },
    "oklch(0.971 0.006 330), which tokens/painted.json has no painted colour for; run `pnpm tokens:paint`",
  ],
  // A literal in a role file's shadow layer reaches Figma too.
  [
    "painted",
    "shadow.overlay",
    (files) => {
      files["color.dark"].shadow.overlay.$value[1].color.components = [
        0.09, 0.02, 330,
      ];
    },
    "oklch(0.09 0.02 330)",
  ],
];

it.each(fixtures)(
  "fails %s on %s and exits non-zero",
  async (check, path, edit, where) => {
    const { code, output } = await tokens(edit);
    const failures = output
      .split("\n")
      .filter((line) => line.includes(`[${check}] ${path} `));

    expect(code).not.toBe(0);
    expect(failures).not.toEqual([]);
    if (where) expect(failures.join("\n")).toContain(where);
  }
);
