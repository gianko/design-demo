// @vitest-environment node

// The one-variant sets of ADR 0015 (#322): Card, EmptyState, PageHeader,
// Sheet and DataTable, each a single variant whose slots are named
// auto-layout placeholder frames, run against the fake Plugin API.

import { readFile } from "node:fs/promises";
import { tv } from "tailwind-variants/lite";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { defineEntry } from "../src/registry/entry.ts";
import { repo } from "../repo.ts";
import type { FigmaPayload } from "../tokens/build.ts";
import { frameSources } from "./components.ts";
import {
  fakePluginApi,
  runScript,
  type FakePluginApi,
} from "./fake-plugin-api.ts";
import {
  framesPayload,
  readTokens,
  type ComponentsPayload,
  type FramePlan,
  type NodePlan,
} from "./frames.ts";
import { syncComponentScripts, type SyncOptions } from "./sync-components.ts";
import { syncScripts as tokenScripts } from "./sync-tokens.ts";

const oneVariantSets = [
  "Card",
  "EmptyState",
  "PageHeader",
  "Sheet",
  "DataTable",
];

let tokens: FigmaPayload;
let payload: ComponentsPayload;

beforeAll(async () => {
  tokens = JSON.parse(
    await readFile(`${repo}/tokens/figma.json`, "utf8")
  ) as FigmaPayload;
  payload = framesPayload(frameSources, await readTokens());
});

type Counts = Record<
  "created" | "updated" | "unchanged" | "orphans" | "pruned" | "changes",
  number
>;
type Report = { counts: Counts; created: string[]; updated: string[] };

async function tokenFile() {
  const file = fakePluginApi();
  for (const { code } of tokenScripts(tokens, { dryRun: false })) {
    await runScript(code, file);
  }
  return file;
}

async function sync(file: FakePluginApi, options: SyncOptions) {
  const reports: Report[] = [];
  for (const { code } of syncComponentScripts(payload, options)) {
    reports.push((await runScript(code, file)) as Report);
  }
  return reports;
}

type Layer = {
  type: string;
  name: string;
  layoutMode?: string;
  sizing?: string[];
  strokeWeight?: number;
  strokeWeights?: number[];
  characters?: string;
  textStyleId?: string;
  effectStyleId?: string;
  description?: string;
  boundVariables?: Record<string, { id: string }>;
  fills?: { boundVariables?: { color?: { id: string } } }[];
  strokes?: { boundVariables?: { color?: { id: string } } }[];
  children?: Layer[];
};

/** The synced file's sets, and readers for what their layers are bound to. */
function read(file: FakePluginApi) {
  const state = file.state();
  const page = (state.pages as unknown as Layer[]).find(
    (p) => p.name === "Components"
  )!;
  const name = (id: string | undefined) =>
    state.variables.find((v) => v.id === id)?.name;
  const set = (setName: string) =>
    page.children!.find(
      (n) => n.type === "COMPONENT_SET" && n.name === setName
    )!;
  return {
    set,
    /** The set's only variant. */
    variant: (setName: string) => {
      const { children } = set(setName);
      expect(children).toHaveLength(1);
      return children![0]!;
    },
    bound: (layer: Layer) =>
      Object.fromEntries(
        Object.entries(layer.boundVariables ?? {}).map(([field, alias]) => [
          field,
          name(alias.id),
        ])
      ),
    paints: (list: Layer["fills"]) =>
      (list ?? []).map((paint) => name(paint.boundVariables?.color?.id)),
    textStyle: (id: string | undefined) =>
      state.textStyles.find((s) => s.id === id)?.name,
    effectStyle: (id: string | undefined) =>
      state.effectStyles.find((s) => s.id === id)?.name,
  };
}

/** The layer at `path` of names, each the first child of that name. */
function at(layer: Layer, ...path: string[]): Layer {
  let node = layer;
  for (const name of path) {
    const found = node.children?.find((c) => c.name === name);
    if (!found) {
      throw new Error(
        `${node.name} has no ${name}; it has ${node.children?.map((c) => c.name).join(", ")}`
      );
    }
    node = found;
  }
  return node;
}

function walk(layer: Layer): Layer[] {
  return [layer, ...(layer.children ?? []).flatMap(walk)];
}

function walkPlan(plan: NodePlan): NodePlan[] {
  return [
    plan,
    ...(plan.type === "FRAME" ? (plan.children ?? []).flatMap(walkPlan) : []),
  ];
}

describe("the one-variant sets", () => {
  it("are generated for Card, EmptyState, PageHeader, Sheet and DataTable, and none for Screen or Stack", () => {
    for (const name of oneVariantSets) {
      const set = payload.sets.find((s) => s.name === name);
      expect(set, name).toBeDefined();
      expect(set!.variants.map((v) => v.name)).toEqual(["variant=default"]);
    }
    expect(payload.setNames).not.toContain("Screen");
    expect(payload.setNames).not.toContain("Stack");
  });

  it.each([
    ["Card", ["header slot", "body slot", "footer slot"]],
    ["EmptyState", []],
    ["PageHeader", ["title slot", "description slot", "actions slot"]],
    ["Sheet", ["title slot", "close button", "body slot"]],
    ["DataTable", ["Checkbox", "cell slot", "actions slot", "detail slot"]],
  ])(
    "draws %s's slots as named auto-layout placeholders: %j",
    (name, placeholders) => {
      const set = payload.sets.find((s) => s.name === name)!;
      const frames = walkPlan(set.variants[0]!).filter(
        (n): n is FramePlan => n.type === "FRAME"
      );
      const named = new Set(
        frames
          .filter(
            (f) => f.name.endsWith(" slot") || placeholders.includes(f.name)
          )
          .map((f) => f.name)
      );
      expect([...named]).toEqual(placeholders);
      for (const frame of frames.filter((f) => named.has(f.name))) {
        expect(frame.layoutMode, frame.name).toBe("HORIZONTAL");
        expect(frame.children!.map((c) => c.type)).toEqual(["TEXT"]);
      }
    }
  );

  it("holds no instance of another component, only frames and text", () => {
    for (const set of payload.sets) {
      for (const node of set.variants.flatMap(walkPlan)) {
        expect(["FRAME", "TEXT"]).toContain(node.type);
      }
    }
  });
});

// A stand-in with no variants: its root holds a `box` slot, which holds a
// `part` slot or a placeholder.
function probe(root: string, box: string, part: string | null = "") {
  const styles = tv({ slots: { root, box, part: part ?? "" } });
  return {
    entry: defineEntry({
      name: "Probe",
      use: "A stand-in.",
      props: z.object({}),
    }),
    styles,
    anatomy: () => ({
      slot: "root",
      children: [
        {
          slot: "box",
          children: [
            part === null ? { placeholder: "part slot" } : { slot: "part" },
          ],
        },
      ],
    }),
    copy: { "part slot": "Part slot" },
  };
}

const probeRoot = async (...args: Parameters<typeof probe>) =>
  framesPayload([probe(...args)], await readTokens()).sets[0]!.variants[0]!;

describe("generating a one-variant set", () => {
  it("draws a placeholder as a chip of sample copy, styled by the placeholder classes", async () => {
    const root = await probeRoot("flex", "flex", null);

    const box = root.children![0] as FramePlan;
    expect(box.children).toEqual([
      expect.objectContaining({
        name: "part slot",
        layoutMode: "HORIZONTAL",
        fills: ["color/bg/surface-hover"],
        children: [
          {
            type: "TEXT",
            name: "label",
            characters: "Part slot",
            textStyle: "caption",
            fills: ["color/text/ink-muted"],
          },
        ],
      }),
    ]);
  });

  it("rules one side of a frame with that side's stroke weight only", async () => {
    const root = await probeRoot("flex border-t border-line", "flex");

    expect(root.strokeWeights).toEqual([1, 0, 0, 0]);
    expect(root.strokeWeight).toBeUndefined();
  });

  it("gives a row its gap-x and a column its gap-y", async () => {
    const root = await probeRoot(
      "flex gap-x-sm gap-y-xs",
      "flex flex-col gap-x-sm gap-y-xs"
    );

    expect(root.bind).toEqual({ itemSpacing: "space/sm" });
    expect((root.children![0] as FramePlan).bind).toEqual({
      itemSpacing: "space/xs",
    });
  });

  it("drops a full share or a grow in a parent that hugs, and fails in one that's fixed", async () => {
    await expect(
      probeRoot("flex", "flex", "flex w-full grow")
    ).resolves.toBeDefined();

    await expect(
      probeRoot("flex", "flex w-sheet", "flex w-full")
    ).rejects.toThrow(
      "Probe (variant=default): the part slot is in auto layout, where figma:sync-components can't place it by x.fraction yet"
    );
    await expect(
      probeRoot("flex", "flex w-sheet", "flex grow")
    ).rejects.toThrow(
      "Probe (variant=default): the part slot takes its parent's spare room"
    );
  });

  it("fails on a wrap along a fixed length", async () => {
    await expect(probeRoot("flex", "flex flex-wrap w-sheet")).rejects.toThrow(
      "the box slot wraps along a fixed length"
    );
  });
});

describe("a first apply of the one-variant sets", () => {
  it("binds Card's surface: auto layout down, padding, gap, radius, its hairline and its width's ceiling", async () => {
    const file = await tokenFile();
    await sync(file, { dryRun: false });

    const { variant, bound, paints } = read(file);
    const card = variant("Card");
    expect(card.layoutMode).toBe("VERTICAL");
    expect(bound(card)).toEqual({
      maxWidth: "size/max-width/card",
      itemSpacing: "space/md",
      paddingTop: "density/padding/surface",
      paddingRight: "density/padding/surface",
      paddingBottom: "density/padding/surface",
      paddingLeft: "density/padding/surface",
      topLeftRadius: "density/radius/surface",
      topRightRadius: "density/radius/surface",
      bottomLeftRadius: "density/radius/surface",
      bottomRightRadius: "density/radius/surface",
    });
    expect(paints(card.fills)).toEqual(["color/bg/surface"]);
    expect(paints(card.strokes)).toEqual(["color/border/line"]);
    expect(card.strokeWeight).toBe(1);
    expect(card.children!.map((c) => c.name)).toEqual([
      "header",
      "body",
      "footer",
    ]);
    const header = at(card, "header");
    expect(header.layoutMode).toBe("VERTICAL");
    expect(at(header, "header slot", "label").characters).toBe("Header slot");
  });

  it("writes EmptyState's two lines as text, in their own type and ink", async () => {
    const file = await tokenFile();
    await sync(file, { dryRun: false });

    const { variant, bound, paints, textStyle } = read(file);
    const empty = variant("EmptyState");
    const title = at(empty, "title");
    expect(bound(title)).toEqual({ maxWidth: "density/max-width/measure" });
    const reason = at(title, "title");
    expect(reason.characters).toBe("No invoices to pay");
    expect(textStyle(reason.textStyleId)).toBe("label");
    expect(paints(reason.fills)).toEqual(["color/text/ink"]);
    const line = at(empty, "text", "text");
    expect(textStyle(line.textStyleId)).toBe("body");
    expect(paints(line.fills)).toEqual(["color/text/ink-muted"]);
  });

  it("draws Sheet as the overlay panel: its width, shadow, and the surface radius on the corners facing the page", async () => {
    const file = await tokenFile();
    await sync(file, { dryRun: false });

    const { variant, bound, paints, effectStyle } = read(file);
    const sheet = variant("Sheet");
    expect(sheet.layoutMode).toBe("VERTICAL");
    // A bound width is fixed; it hugs its content down.
    expect(sheet.sizing).toEqual(["AUTO", "FIXED"]);
    expect(bound(sheet)).toMatchObject({
      width: "size/width/sheet",
      topLeftRadius: "density/radius/surface",
      bottomLeftRadius: "density/radius/surface",
    });
    expect(bound(sheet)).not.toHaveProperty("topRightRadius");
    expect(paints(sheet.fills)).toEqual(["color/bg/surface-overlay"]);
    expect(effectStyle(sheet.effectStyleId)).toBe("shadow/overlay");
    expect(at(sheet, "header").children!.map((c) => c.name)).toEqual([
      "title",
      "close button",
    ]);
    expect(bound(at(sheet, "header", "title"))).toEqual({
      minHeight: "density/height/control",
    });
  });

  it("draws DataTable's rows from tv(): a row's height, a top rule only, and a Checkbox placeholder first", async () => {
    const file = await tokenFile();
    await sync(file, { dryRun: false });

    const { set, variant, bound, paints, textStyle } = read(file);
    const table = at(variant("DataTable"), "body", "table");
    const rows = table.children!.filter((c) => c.name === "row");
    expect(rows).toHaveLength(3);
    const [row] = rows;
    expect(row!.layoutMode).toBe("HORIZONTAL");
    expect(bound(row!)).toEqual({ height: "density/height/row" });
    expect(paints(row!.strokes)).toEqual(["color/border/line"]);
    expect(row!.strokeWeights).toEqual([1, 0, 0, 0]);
    expect(row!.children!.map((c) => c.name)).toEqual([
      "select",
      "cell",
      "cell",
      "cell",
    ]);
    expect(at(row!, "select", "selector", "Checkbox", "label").characters).toBe(
      "Checkbox"
    );
    const column = at(table, "headerRow", "header", "column 1");
    expect(column.characters).toBe("Invoice");
    expect(textStyle(column.textStyleId)).toBe("column-header");
    expect(
      at(variant("DataTable"), "footer", "count", "count").characters
    ).toBe("2 invoices selected");
    expect(set("DataTable").description).toContain("Storybook");
  });

  it("puts PageHeader's title and description in its heading, and its actions beside them", async () => {
    const file = await tokenFile();
    await sync(file, { dryRun: false });

    const { variant, bound } = read(file);
    const header = variant("PageHeader");
    expect(header.layoutMode).toBe("HORIZONTAL");
    expect(at(header, "heading").layoutMode).toBe("VERTICAL");
    expect(at(header, "heading").children!.map((c) => c.name)).toEqual([
      "title slot",
      "description slot",
    ]);
    expect(bound(at(header, "actions"))).toEqual({ itemSpacing: "space/2xs" });
  });

  it("has no instance anywhere on the page", async () => {
    const file = await tokenFile();
    await sync(file, { dryRun: false });

    const { set } = read(file);
    for (const name of oneVariantSets) {
      for (const layer of walk(set(name)).slice(1)) {
        expect(["COMPONENT", "FRAME", "TEXT"]).toContain(layer.type);
      }
    }
  });
});

describe("a re-run with the one-variant sets", () => {
  it.each([false, true])(
    "changes nothing, in a dry run or an apply (split: %s)",
    async (split) => {
      const file = await tokenFile();
      await sync(file, { dryRun: false, split });
      const before = file.state();

      const dryRun = await sync(file, { dryRun: true, split });
      const applied = await sync(file, { dryRun: false, split });

      const variants = payload.sets.reduce(
        (sum, set) => sum + set.variants.length,
        0
      );
      for (const reports of [dryRun, applied]) {
        const total = (field: keyof Counts) =>
          reports.reduce((sum, r) => sum + r.counts[field], 0);
        expect(total("changes")).toBe(0);
        expect(total("orphans")).toBe(0);
        expect(total("unchanged")).toBe(variants + payload.sets.length);
      }
      expect(file.state()).toEqual(before);
    }
  );
});
