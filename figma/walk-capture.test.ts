// @vitest-environment node

import { readFile } from "node:fs/promises";
import { beforeEach, expect, it } from "vitest";
import { repo } from "../repo.ts";
import type { FigmaPayload } from "../tokens/build.ts";
import {
  fakePluginApi,
  runScript as run,
  type FakePluginApi,
} from "./fake-plugin-api.ts";
import { syncScripts } from "./sync-tokens.ts";
import { walkScript } from "./walk-capture.ts";

type Report = {
  frames: {
    id: string;
    name: string;
    modes: Record<string, string[]>;
    bound: Record<string, string[]>;
    missing: string[];
    literal: string[];
  }[];
};

let file: FakePluginApi;

// A capture binds to the variables a token sync wrote.
beforeEach(async () => {
  file = fakePluginApi();
  const payload = JSON.parse(
    await readFile(`${repo}/tokens/figma.json`, "utf8")
  ) as FigmaPayload;
  for (const { code } of syncScripts(payload, { dryRun: false })) {
    await run(code, file);
  }
});

it("reports a captured frame's modes and the variables bound under it, by kind", async () => {
  const frame = file.addNode({
    name: "Screens/smoke — Dark",
    explicitModes: { Color: "Dark" },
    bound: {
      fills: ["color/bg/page"],
      paddingLeft: "density/padding/page",
      paddingTop: "density/padding/page",
    },
    children: [
      {
        name: "Card",
        // A capture pins a mode where the bindings under it need it, not
        // only on the frame it returns.
        explicitModes: { Density: "Contractor" },
        bound: {
          fills: ["color/bg/surface"],
          strokes: ["color/border/line"],
          itemSpacing: "space/sm",
          topLeftRadius: "radius/control",
        },
        children: [
          {
            name: "Welcome back.",
            type: "TEXT",
            bound: {
              fontFamily: ["type/family/sans"],
              fontSize: ["type/caption/font-size"],
              fontWeight: ["type/weight/regular"],
            },
          },
        ],
      },
    ],
  });

  const report = (await run(walkScript([frame]), file)) as Report;

  expect(report.frames).toEqual([
    {
      id: frame,
      name: "Screens/smoke — Dark",
      modes: { Color: ["Dark"], Density: ["Contractor"] },
      bound: {
        colour: ["color/bg/page", "color/bg/surface", "color/border/line"],
        spacing: ["density/padding/page", "space/sm"],
        radius: ["radius/control"],
        type: [
          "type/caption/font-size",
          "type/family/sans",
          "type/weight/regular",
        ],
        other: [],
      },
      missing: [],
      literal: [],
    },
  ]);
});

it("names each kind the capture didn't bind as missing", async () => {
  const frame = file.addNode({
    name: "Screens/smoke — Light",
    explicitModes: { Color: "Light", Density: "Contractor" },
    bound: { fills: ["color/bg/page"], minHeight: "density/min-height/target" },
  });

  const [report] = ((await run(walkScript([frame]), file)) as Report).frames;

  expect(report!.bound.other).toEqual(["density/min-height/target"]);
  expect(report!.missing).toEqual(["spacing", "radius", "type"]);
});

// A dark page fill that drifted from its variable's value stays literal
// (#59): the capture neither binds it nor pins Dark above it.
it("lists every opaque solid paint the capture left unbound", async () => {
  const frame = file.addNode({
    name: "Screens/smoke — Dark",
    literal: { fills: [[24, 17, 24]] },
    children: [
      {
        name: "Screen",
        literal: { fills: [[24, 17, 24]] },
        children: [
          {
            name: "Card",
            bound: { fills: ["color/bg/surface"] },
            literal: { strokes: [[124, 112, 122]] },
          },
          {
            name: "Welcome back.",
            type: "TEXT",
            bound: { fills: ["color/text/ink"] },
          },
        ],
      },
    ],
  });

  const [report] = ((await run(walkScript([frame]), file)) as Report).frames;

  expect(report!.literal).toEqual([
    "Screens/smoke — Dark fills rgb(24,17,24)",
    "Screen fills rgb(24,17,24)",
    "Card strokes rgb(124,112,122)",
  ]);
});

// Alpha never binds, and a hidden paint isn't drawn, so neither is a miss.
it("leaves out translucent and hidden paints", async () => {
  const frame = file.addNode({
    name: "Sheet",
    literal: {
      fills: [{ rgb: [24, 17, 24], visible: false }],
      strokes: [[255, 255, 255, 0.5]],
    },
  });

  const [report] = ((await run(walkScript([frame]), file)) as Report).frames;

  expect(report!.literal).toEqual([]);
});

// Text with more than one fill reports figma.mixed, which the walk can't
// check paint by paint, so it names the node for the human to look at.
it("names a text node with mixed fills rather than skipping it", async () => {
  const frame = file.addNode({
    name: "Screen",
    children: [{ name: "Due 3 May", type: "TEXT", mixedFills: true }],
  });

  const [report] = ((await run(walkScript([frame]), file)) as Report).frames;

  expect(report!.literal).toEqual(["Due 3 May fills mixed"]);
});

it("throws on a node the file doesn't hold", async () => {
  await expect(run(walkScript(["99:1"]), file)).rejects.toThrow(
    "figma:walk-capture: no node 99:1"
  );
});
