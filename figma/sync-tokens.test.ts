// @vitest-environment node

import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import { repo } from "../repo.ts";
import type { FigmaPayload } from "../tokens/build.ts";
import { fakePluginApi, type FakePluginApi } from "./fake-plugin-api.ts";
import { codeLimit, syncScripts, type SyncOptions } from "./sync-tokens.ts";

let payload: FigmaPayload;
let variableCount: number;

beforeAll(async () => {
  payload = JSON.parse(
    await readFile(`${repo}/tokens/figma.json`, "utf8")
  ) as FigmaPayload;
  variableCount = payload.collections.reduce(
    (sum, { variables }) => sum + variables.length,
    0
  );
});

const AsyncFunction = (async () => {}).constructor as new (
  ...args: string[]
) => (figma: unknown) => Promise<unknown>;

/** Runs one script the way use_figma does: its body, with `figma` in scope. */
function run(code: string, file: FakePluginApi) {
  return new AsyncFunction("figma", code)(file.figma) as Promise<Report>;
}

/** Writes the scripts for `options` and runs them in order. */
async function sync(
  file: FakePluginApi,
  options: SyncOptions = { dryRun: false },
  source: FigmaPayload = payload
) {
  const reports: Report[] = [];
  for (const { code } of syncScripts(source, options)) {
    reports.push(await run(code, file));
  }
  return reports;
}

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
  unbound: string[];
};

describe("a sync into an empty file", () => {
  it("creates every collection, variable and style, and counts them", async () => {
    const file = fakePluginApi();

    const [report] = await sync(file);

    expect(report!.counts).toMatchObject({
      created:
        payload.collections.length +
        variableCount +
        payload.textStyles.length +
        payload.effectStyles.length,
      updated: 0,
      unchanged: 0,
    });
    expect(report!.created).toContain("Color (collection)");
    expect(report!.created).toContain("color/bg/page");
    expect(report!.created).toContain("body (text style)");
    expect(report!.created).toContain("shadow/raised (effect style)");
    expect(report!.unbound).toEqual([]);
  });

  it("gives each --ds-* variable its code syntax, and the rest none", async () => {
    const file = fakePluginApi();

    await sync(file);
    const codeSyntax = (name: string) =>
      file.state().variables.find((v) => v.name === name)!.codeSyntax;

    expect(codeSyntax("density/text/body/line-height")).toEqual({
      WEB: "var(--ds-density-text-body-line-height)",
    });
    expect(codeSyntax("primitive/neutral/740")).toEqual({});
    expect(codeSyntax("shadow/raised/1/blur")).toEqual({});
  });

  it("is followed by a dry run that reports zero changes", async () => {
    const file = fakePluginApi();
    await sync(file);
    const before = file.state();

    const [report] = await sync(file, { dryRun: true });

    expect(report!.counts).toMatchObject({
      changes: 0,
      created: 0,
      updated: 0,
      unchanged:
        variableCount + payload.textStyles.length + payload.effectStyles.length,
      orphans: 0,
    });
    expect(file.state()).toEqual(before);
  });

  it("is diffed by a dry run beforehand, which writes nothing", async () => {
    const file = fakePluginApi();

    const [dryRun] = await sync(file, { dryRun: true });
    const [applied] = await sync(file);

    expect(dryRun!.created).toEqual(applied!.created);
    expect(dryRun!.dryRun).toBe(true);
  });
});

describe("a tampered script", () => {
  // The agent re-types the script into use_figma, so a slip lands in its data.
  it.each([
    ["a value", (code: string) => code.replace('"Admin":14', '"Admin":15')],
    [
      "a name",
      (code: string) => code.replace('"color/bg/page"', '"color/bg/pages"'),
    ],
    [
      "the mode",
      (code: string) => code.replace('"dryRun":true', '"dryRun":false'),
    ],
  ])(
    "throws on its checksum when %s changes, and writes nothing",
    async (_, tamper) => {
      const file = fakePluginApi();
      await sync(file);
      const before = file.state();
      const { code } = syncScripts(payload, { dryRun: true })[0]!;
      const tampered = tamper(code);
      expect(tampered).not.toBe(code);

      await expect(run(tampered, file)).rejects.toThrow("checksum mismatch");
      expect(file.state()).toEqual(before);
    }
  );
});

describe("a sync into a file that has drifted", () => {
  it("updates a hand-edited value in place and counts it", async () => {
    const file = fakePluginApi();
    await sync(file);
    const space = (await file.figma.variables.getLocalVariablesAsync()).find(
      (v) => v.name === "space/sm"
    )!;
    const [modeId] = Object.keys(space.valuesByMode);
    space.setValueForMode(modeId!, 18);

    const [dryRun] = await sync(file, { dryRun: true });
    const [report] = await sync(file);

    expect(dryRun!.updated).toEqual(["space/sm (value:Value)"]);
    expect(report!.counts).toMatchObject({ created: 0, updated: 1 });
    expect(space.valuesByMode[modeId!]).toBe(16);
    expect((await sync(file, { dryRun: true }))[0]!.counts.changes).toBe(0);
  });

  it("reports a stray variable and style as orphans and keeps them", async () => {
    const file = fakePluginApi();
    await sync(file);
    const space = (
      await file.figma.variables.getLocalVariableCollectionsAsync()
    ).find((c) => c.name === "Space")!;
    const stray = file.figma.variables.createVariable(
      "space/legacy",
      space,
      "FLOAT"
    );
    const style = file.figma.createEffectStyle();
    style.name = "shadow/old";

    const [report] = await sync(file);

    expect(report!.orphans).toEqual([
      { kind: "variable", name: "space/legacy", id: stray.id },
      { kind: "effect style", name: "shadow/old", id: style.id },
    ]);
    expect(report!.counts.changes).toBe(0);
    expect(file.state().variables.map((v) => v.id)).toContain(stray.id);
  });

  it("deletes exactly the orphans --prune names, and nothing else", async () => {
    const file = fakePluginApi();
    await sync(file);
    const space = (
      await file.figma.variables.getLocalVariableCollectionsAsync()
    ).find((c) => c.name === "Space")!;
    const pruned = file.figma.variables.createVariable(
      "space/legacy",
      space,
      "FLOAT"
    );
    const kept = file.figma.variables.createVariable(
      "space/older",
      space,
      "FLOAT"
    );

    const [dryRun] = await sync(file, { dryRun: true, prune: [pruned.id] });
    const [report] = await sync(file, { dryRun: false, prune: [pruned.id] });

    expect(dryRun!.pruned).toEqual([
      { kind: "variable", name: "space/legacy", id: pruned.id },
    ]);
    expect(report!.pruned).toEqual(dryRun!.pruned);
    expect(report!.orphans).toEqual([
      { kind: "variable", name: "space/older", id: kept.id },
    ]);
    const ids = file.state().variables.map((v) => v.id);
    expect(ids).not.toContain(pruned.id);
    expect(ids).toContain(kept.id);
  });

  it("reports a stray mode as an orphan, and removes it only by its ID", async () => {
    const file = fakePluginApi();
    await sync(file);
    const color = (
      await file.figma.variables.getLocalVariableCollectionsAsync()
    ).find((c) => c.name === "Color")!;
    const stray = color.addMode("Mode 1");

    const [report] = await sync(file);
    const [pruned] = await sync(file, { dryRun: false, prune: [stray] });

    expect(report!.orphans).toEqual([
      { kind: "mode", name: "Color/Mode 1", id: stray },
    ]);
    expect(pruned!.pruned).toEqual(report!.orphans);
    expect(color.modes.map((mode) => mode.name)).toEqual(["Light", "Dark"]);
  });

  it("refuses to prune a variable the payload still holds, and writes nothing", async () => {
    const file = fakePluginApi();
    await sync(file);
    const before = file.state();
    const synced = before.variables.find((v) => v.name === "space/sm")!;

    await expect(
      run(
        syncScripts(payload, { dryRun: false, prune: [synced.id] })[0]!.code,
        file
      )
    ).rejects.toThrow(`${synced.id} isn't an orphan`);
    expect(file.state()).toEqual(before);
  });

  it("replaces a variable whose type changed only once it is pruned", async () => {
    const file = fakePluginApi();
    await sync(file);
    const radius = (await file.figma.variables.getLocalVariablesAsync()).find(
      (v) => v.name === "radius/tag"
    )!;
    const retyped: FigmaPayload = structuredClone(payload);
    const tag = retyped.collections
      .find((c) => c.name === "Radius")!
      .variables.find((v) => v.name === "radius/tag")!;
    Object.assign(tag, {
      type: "STRING",
      scopes: ["ALL_SCOPES"],
      valuesByMode: { Value: "4px" },
    });

    await expect(sync(file, { dryRun: false }, retyped)).rejects.toThrow(
      `radius/tag is a FLOAT in Figma but a STRING in the payload. Prune ${radius.id}`
    );
    const [report] = await sync(
      file,
      { dryRun: false, prune: [radius.id] },
      retyped
    );

    expect(report!.pruned).toEqual([
      { kind: "variable", name: "radius/tag", id: radius.id },
    ]);
    expect(report!.created).toEqual(["radius/tag"]);
  });
});

describe("--split", () => {
  it("writes one script per collection, then styles, that sync like one", async () => {
    const whole = fakePluginApi();
    const split = fakePluginApi();
    await sync(whole);

    const reports = await sync(split, { dryRun: false, split: true });

    expect(
      syncScripts(payload, { dryRun: false, split: true }).map((s) => s.name)
    ).toEqual([
      ...payload.collections.map((c) => c.name.toLowerCase()),
      "styles",
    ]);
    expect(reports.reduce((sum, r) => sum + r.counts.created, 0)).toBe(
      (await sync(fakePluginApi()))[0]!.counts.created
    );
    expect(strip(split.state())).toEqual(strip(whole.state()));
    expect((await sync(split, { dryRun: true }))[0]!.counts.changes).toBe(0);
  });
});

describe("the committed payload", () => {
  it("fits one use_figma call", () => {
    const [script] = syncScripts(payload, { dryRun: false });

    expect(script!.code.length).toBeLessThanOrEqual(codeLimit);
  });
});

/** A file's state without its IDs, which differ between two fresh files. */
function strip(state: ReturnType<FakePluginApi["state"]>) {
  return JSON.parse(
    JSON.stringify(state).replace(
      /"(VariableCollectionId|VariableID|mode|S):\d+"/g,
      '"id"'
    )
  );
}
