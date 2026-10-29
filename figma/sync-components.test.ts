// @vitest-environment node

import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import { repo } from "../repo.ts";
import type { FigmaPayload } from "../tokens/build.ts";
import { frameSources } from "./components.ts";
import {
  fakePluginApi,
  runScript,
  type FakePluginApi,
} from "./fake-plugin-api.ts";
import { framesPayload, readTokens, type ComponentsPayload } from "./frames.ts";
import { codeLimit } from "./scripts.ts";
import { syncComponentScripts, type SyncOptions } from "./sync-components.ts";
import { syncScripts as tokenScripts } from "./sync-tokens.ts";

let tokens: FigmaPayload;
let payload: ComponentsPayload;

beforeAll(async () => {
  tokens = JSON.parse(
    await readFile(`${repo}/tokens/figma.json`, "utf8")
  ) as FigmaPayload;
  payload = framesPayload(frameSources, await readTokens());
});

type Report = {
  dryRun: boolean;
  counts: Record<
    "created" | "updated" | "unchanged" | "orphans" | "pruned" | "changes",
    number
  >;
  created: string[];
  updated: string[];
  orphans: { kind: string; name: string; id: string }[];
  pruned: { kind: string; name: string; id: string }[];
  remaining?: Report["counts"];
};

const run = (code: string, file: FakePluginApi) =>
  runScript(code, file) as Promise<Report>;

/** A file figma:sync-tokens has already run on, as the components sync needs. */
async function tokenFile(options?: Parameters<typeof fakePluginApi>[1]) {
  const file = fakePluginApi(undefined, options);
  for (const { code } of tokenScripts(tokens, { dryRun: false })) {
    await runScript(code, file);
  }
  return file;
}

async function sync(
  file: FakePluginApi,
  options: SyncOptions = { dryRun: false }
) {
  const reports: Report[] = [];
  for (const { code } of syncComponentScripts(payload, options)) {
    reports.push(await run(code, file));
  }
  return reports;
}

// ── Reading the fake file back ──

type Layer = {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  constraints: { horizontal: string; vertical: string };
  generator: string;
  characters?: string;
  textStyleId?: string;
  layoutMode?: string;
  sizing?: string[];
  alignment?: string[];
  clipsContent?: boolean;
  strokeWeight?: number;
  boundVariables?: Record<string, { id: string }>;
  fills?: { boundVariables?: { color?: { id: string } } }[];
  strokes?: { boundVariables?: { color?: { id: string } } }[];
  description?: string;
  children?: Layer[];
};

function components(file: FakePluginApi) {
  const state = file.state();
  const page = (state.pages as unknown as Layer[]).find(
    (p) => p.name === "Components"
  );
  const variable = (id: string | undefined) =>
    state.variables.find((v) => v.id === id)?.name;
  const textStyle = (id: string | undefined) =>
    state.textStyles.find((s) => s.id === id)?.name;
  const sets = (page?.children ?? []).filter((n) => n.type === "COMPONENT_SET");
  const variant = (name: string, set = "Button") =>
    sets
      .find((s) => s.name === set && s.generator === "figma:sync-components")!
      .children!.find((c) => c.name === name)!;
  const bound = (layer: Layer) =>
    Object.fromEntries(
      Object.entries(layer.boundVariables ?? {}).map(([field, alias]) => [
        field,
        variable(alias.id),
      ])
    );
  const paints = (list: Layer["fills"]) =>
    (list ?? []).map((paint) => variable(paint.boundVariables?.color?.id));
  return { page, sets, variant, bound, paints, textStyle };
}

const child = (layer: Layer, name: string) =>
  layer.children!.find((c) => c.name === name)!;

describe("a first apply", () => {
  it("creates the Button set, one variant per intent × disabled × pending", async () => {
    const file = await tokenFile();

    const [report] = await sync(file);

    const { sets } = components(file);
    expect(sets.map((s) => s.name)).toEqual(["Button"]);
    expect(sets[0]!.children!.map((c) => c.name)).toEqual([
      "intent=primary, disabled=false, pending=false",
      "intent=secondary, disabled=false, pending=false",
      "intent=quiet, disabled=false, pending=false",
      "intent=primary, disabled=true, pending=false",
      "intent=secondary, disabled=true, pending=false",
      "intent=quiet, disabled=true, pending=false",
      "intent=primary, disabled=false, pending=true",
      "intent=secondary, disabled=false, pending=true",
      "intent=quiet, disabled=false, pending=true",
      "intent=primary, disabled=true, pending=true",
      "intent=secondary, disabled=true, pending=true",
      "intent=quiet, disabled=true, pending=true",
    ]);
    expect(report!.created).toEqual([
      "Components (page)",
      "Button (component set)",
      ...sets[0]!.children!.map((c) => `Button/${c.name}`),
    ]);
    expect(report!.remaining).toMatchObject({ changes: 0 });
  });

  it("binds a variant's auto layout, padding, radius, fills, strokes and type to variables", async () => {
    const file = await tokenFile();

    await sync(file);

    const { variant, bound, paints, textStyle } = components(file);
    const secondary = variant(
      "intent=secondary, disabled=false, pending=false"
    );
    expect(secondary.layoutMode).toBe("HORIZONTAL");
    expect(secondary.alignment).toEqual(["CENTER", "CENTER"]);
    // It hugs its label across and is the control's height down.
    expect(secondary.sizing).toEqual(["AUTO", "FIXED"]);
    expect(bound(secondary)).toEqual({
      height: "density/height/control",
      paddingLeft: "density/padding/control",
      paddingRight: "density/padding/control",
      topLeftRadius: "radius/control",
      topRightRadius: "radius/control",
      bottomLeftRadius: "radius/control",
      bottomRightRadius: "radius/control",
    });
    expect(paints(secondary.fills)).toEqual(["color/bg/surface"]);
    expect(paints(secondary.strokes)).toEqual(["color/border/control"]);
    expect(secondary.strokeWeight).toBe(1);
    const label = child(secondary, "label");
    expect(label.characters).toBe("Approve and pay");
    expect(textStyle(label.textStyleId)).toBe("label");
    expect(paints(label.fills)).toEqual(["color/text/ink"]);

    const quietDisabled = variant("intent=quiet, disabled=true, pending=false");
    expect(paints(quietDisabled.fills)).toEqual([]);
    expect(paints(quietDisabled.strokes)).toEqual([]);
    expect(paints(child(quietDisabled, "label").fills)).toEqual([
      "color/text/disabled",
    ]);
  });

  it("draws pending's progress edge still, as reduced motion shows it: the middle third along the bottom", async () => {
    const file = await tokenFile();

    await sync(file);

    const { variant, bound, paints } = components(file);
    const pending = variant("intent=primary, disabled=false, pending=true");
    expect(pending.clipsContent).toBe(true);
    const edge = child(pending, "edge");
    expect(bound(edge)).toEqual({ height: "size/height/edge" });
    expect(edge.constraints).toEqual({
      horizontal: "STRETCH",
      vertical: "MAX",
    });
    expect([edge.x, edge.y, edge.width, edge.height]).toEqual([
      0,
      pending.height - 2,
      pending.width,
      2,
    ]);
    const sweep = child(edge, "sweep");
    expect(paints(sweep.fills)).toEqual(["color/bg/progress"]);
    expect(sweep.constraints).toEqual({
      horizontal: "SCALE",
      vertical: "STRETCH",
    });
    expect(sweep.x).toBeCloseTo(edge.width / 3);
    expect(sweep.width).toBeCloseTo(edge.width / 3);
    expect(sweep.height).toBe(2);
    // A disabled button can't be pending, so that pair ships without the edge.
    const disabled = variant("intent=primary, disabled=true, pending=true");
    expect(disabled.children!.map((c) => c.name)).toEqual(["label"]);
  });

  it("lays the variants out in a grid, one intent per column", async () => {
    const file = await tokenFile();

    await sync(file);

    const { sets } = components(file);
    const [first, second, third, fourth] = sets[0]!.children!;
    expect(second!.y).toBe(first!.y);
    expect(third!.x).toBeGreaterThan(second!.x);
    expect(fourth!.x).toBe(first!.x);
    expect(fourth!.y).toBeGreaterThan(first!.y);
  });

  it("throws on a write that didn't stick, so Figma keeps none of it", async () => {
    const file = await tokenFile({ ignoreNodeWrites: ["characters"] });

    await expect(sync(file)).rejects.toThrow(
      "figma:sync-components: after writing, Button/intent=primary, disabled=false, pending=false (label.characters), "
    );
  });

  it("refuses a file figma:sync-tokens hasn't run on", async () => {
    const file = fakePluginApi();

    await expect(sync(file, { dryRun: true })).rejects.toThrow(
      "run figma:sync-tokens first"
    );
  });
});

describe("the rest of the library", () => {
  it("draws StatusTag's statuses in the tag's own words, each on its tint", async () => {
    const file = await tokenFile();

    await sync(file);

    const { sets, variant, bound, paints, textStyle } = components(file);
    const tag = sets.find((s) => s.name === "StatusTag")!;
    expect(tag.children!.map((c) => c.name)).toEqual([
      "status=awaiting",
      "status=overdue",
      "status=paid",
      "status=scheduled",
      "status=failed",
    ]);
    const overdue = variant("status=overdue", "StatusTag");
    expect(paints(overdue.fills)).toEqual(["color/bg/overdue"]);
    expect(bound(overdue)).toMatchObject({
      paddingLeft: "space/2xs",
      paddingRight: "space/2xs",
      topLeftRadius: "radius/tag",
    });
    // It hugs its word, as an inline-block does.
    expect(overdue.layoutMode).not.toBe("NONE");
    expect(overdue.sizing).toEqual(["AUTO", "AUTO"]);
    const word = child(overdue, "word");
    expect(word.characters).toBe("Overdue");
    expect(textStyle(word.textStyleId)).toBe("label");
    expect(paints(word.fills)).toEqual(["color/text/overdue"]);
  });
});

describe("a re-run", () => {
  it("changes nothing, in a dry run or an apply", async () => {
    const file = await tokenFile();
    await sync(file);
    const before = file.state();

    const [dryRun] = await sync(file, { dryRun: true });
    const [applied] = await sync(file);

    for (const report of [dryRun!, applied!]) {
      expect(report.counts).toMatchObject({
        created: 0,
        updated: 0,
        changes: 0,
        orphans: 0,
        // Twelve variants and the set.
        unchanged: 13,
      });
    }
    expect(file.state()).toEqual(before);
  });

  it("puts a hand-edited variant back in place and says what it changed", async () => {
    const file = await tokenFile();
    await sync(file);
    const { variant } = components(file);
    const id = variant("intent=primary, disabled=false, pending=false").id;
    const label = (await findNode(file, id)).children[0]!;
    label.characters = "Pay";
    (await findNode(file, id)).paddingLeft = 3;

    const [dryRun] = await sync(file, { dryRun: true });
    const [applied] = await sync(file);

    expect(dryRun!.updated).toEqual([
      "Button/intent=primary, disabled=false, pending=false (paddingLeft, label.characters)",
    ]);
    expect(applied!.updated).toEqual(dryRun!.updated);
    expect(
      child(
        components(file).variant(
          "intent=primary, disabled=false, pending=false"
        ),
        "label"
      ).characters
    ).toBe("Approve and pay");
  });
});

describe("orphans", () => {
  // #15 hand-built a Button set and a modes frame on the Components page.
  async function withSpikeSet() {
    const file = await tokenFile();
    const { figma } = file as unknown as { figma: Scene };
    const page = figma.createPage();
    page.name = "Components";
    await figma.setCurrentPageAsync(page);
    const primary = figma.createComponent();
    primary.name = "intent=primary";
    const spike = figma.combineAsVariants([primary], page);
    spike.name = "Button";
    const modes = figma.createFrame();
    modes.name = "Button / modes";
    return { file, spike, modes };
  }

  it("reports the #15 Button set and anything else on the page, and keeps them", async () => {
    const { file, spike, modes } = await withSpikeSet();

    const [dryRun] = await sync(file, { dryRun: true });
    const [applied] = await sync(file);

    const orphans = [
      { kind: "COMPONENT_SET", name: "Button", id: spike.id },
      { kind: "FRAME", name: "Button / modes", id: modes.id },
    ];
    expect(dryRun!.orphans).toEqual(orphans);
    expect(dryRun!.created).toContain("Button (component set)");
    expect(applied!.orphans).toEqual(orphans);
    const { page, sets } = components(file);
    expect(page!.children!.map((n) => n.id)).toEqual(
      expect.arrayContaining([spike.id, modes.id])
    );
    expect(sets).toHaveLength(2);
    // A re-run finds its own set by its mark, not the hand-built one.
    expect((await sync(file, { dryRun: true }))[0]!.counts.changes).toBe(0);
  });

  it("deletes exactly the orphans --prune names", async () => {
    const { file, spike, modes } = await withSpikeSet();

    const [report] = await sync(file, { dryRun: false, prune: [spike.id] });

    expect(report!.pruned).toEqual([
      { kind: "COMPONENT_SET", name: "Button", id: spike.id },
    ]);
    const ids = components(file).page!.children!.map((n) => n.id);
    expect(ids).not.toContain(spike.id);
    expect(ids).toContain(modes.id);
  });

  it("refuses to prune what it generated, and writes nothing", async () => {
    const file = await tokenFile();
    await sync(file);
    const before = file.state();
    const ours = components(file).sets[0]!.id;

    await expect(sync(file, { dryRun: false, prune: [ours] })).rejects.toThrow(
      `${ours} isn't an orphan`
    );
    expect(file.state()).toEqual(before);
  });
});

describe("a tampered script", () => {
  it.each([
    [
      "the copy",
      (code: string) => code.replace('"Approve and pay"', '"Approve and Pay"'),
    ],
    [
      "a binding",
      (code: string) => code.replace('"color/bg/accent"', '"color/bg/surface"'),
    ],
    [
      "the mode",
      (code: string) => code.replace('"dryRun":true', '"dryRun":false'),
    ],
  ])(
    "throws on its checksum when %s changes, and writes nothing",
    async (_, tamper) => {
      const file = await tokenFile();
      const before = file.state();
      const { code } = syncComponentScripts(payload, { dryRun: true })[0]!;
      const tampered = tamper(code);
      expect(tampered).not.toBe(code);

      await expect(run(tampered, file)).rejects.toThrow("checksum mismatch");
      expect(file.state()).toEqual(before);
    }
  );
});

describe("--split", () => {
  it("writes one script per component set, which syncs like one", async () => {
    const whole = await tokenFile();
    const split = await tokenFile();
    await sync(whole);

    const scripts = syncComponentScripts(payload, {
      dryRun: false,
      split: true,
    });
    await sync(split, { dryRun: false, split: true });

    expect(scripts.map((s) => s.name)).toEqual(["button"]);
    expect(strip(split.state())).toEqual(strip(whole.state()));
  });
});

describe("the generated script", () => {
  it("fits one use_figma call", () => {
    const [script] = syncComponentScripts(payload, { dryRun: false });

    expect(script!.code.length).toBeLessThanOrEqual(codeLimit);
  });
});

// ── Helpers ──

type SceneNode = {
  id: string;
  name: string;
  type: string;
  children: SceneNode[] & { characters?: string }[];
  paddingLeft: number;
};
type Scene = {
  createPage(): SceneNode;
  setCurrentPageAsync(page: SceneNode): Promise<void>;
  createComponent(): SceneNode;
  createFrame(): SceneNode;
  combineAsVariants(nodes: SceneNode[], parent: SceneNode): SceneNode;
  root: { children: SceneNode[] };
};

async function findNode(file: FakePluginApi, id: string) {
  const { figma } = file as unknown as { figma: Scene };
  const walk = (nodes: SceneNode[]): SceneNode | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = walk(node.children ?? []);
      if (found) return found;
    }
  };
  const node = walk(figma.root.children);
  if (!node) throw new Error(`no node ${id}`);
  return node as SceneNode & {
    children: (SceneNode & { characters: string })[];
  };
}

/** A file's state without its IDs, which differ between two files. */
function strip(state: ReturnType<FakePluginApi["state"]>) {
  return JSON.parse(
    JSON.stringify(state).replace(
      /"(VariableCollectionId|VariableID|mode|S|node):\d+"/g,
      '"id"'
    )
  );
}
