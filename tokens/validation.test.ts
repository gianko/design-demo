import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, expect, it } from "vitest";
import { build, readSources, type Check, type Sources } from "./build.ts";

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

it("writes both outputs and exits 0 on the committed sources", async () => {
  const { code, dir } = await tokens(() => {});
  const built = build(sources);

  expect(code).toBe(0);
  expect(built.ok && built.css).toBe(
    await readFile(join(dir, "tokens.css"), "utf8")
  );
  expect(built.ok && built.ts).toBe(
    await readFile(join(dir, "tokens.ts"), "utf8")
  );
});

// One failing fixture per validation in spec § Token build.
const fixtures: [
  check: Check,
  path: string,
  edit: Parameters<typeof tokens>[0],
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
];

it.each(fixtures)(
  "fails %s on %s and exits non-zero",
  async (check, path, edit) => {
    const { code, output } = await tokens(edit);

    expect(code).not.toBe(0);
    expect(output).toContain(`[${check}] ${path} `);
  }
);
