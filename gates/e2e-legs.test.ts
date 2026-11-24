import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { parseLeg, rendersStory, targetsOf } from "./e2e-legs.ts";
import { repo } from "../repo.ts";

const targets = [
  "Heading",
  "NoPill",
  "OnePixel",
  "TextOverflow",
  "TypeOnScale",
];

describe("parseLeg", () => {
  it("runs everything when no leg is named", () => {
    expect(parseLeg(undefined)).toEqual({ kind: "all" });
    expect(parseLeg("")).toEqual({ kind: "all" });
  });

  it.each(["4/3", "0/3", "1", "1/0", "others", "1/3x"])(
    "rejects %s rather than running nothing",
    (value) => {
      expect(() => parseLeg(value)).toThrow("GATE_E2E_LEG");
    }
  );
});

describe("the workflow's legs", () => {
  const workflow = parse(
    readFileSync(join(repo, ".github/workflows/gate-e2e.yml"), "utf8")
  ) as {
    jobs: Record<
      string,
      {
        strategy: { "fail-fast": boolean; matrix: { leg: string[] } };
        steps: { run?: string; env?: Record<string, string> }[];
      }
    >;
  };
  const job = workflow.jobs["gate-e2e"]!;
  const legs = job.strategy.matrix.leg.map(parseLeg);

  it("render every target exactly once", () => {
    const rendered = legs.flatMap((leg) => targetsOf(leg, targets));
    expect(rendered.toSorted()).toEqual(targets.toSorted());
  });

  it("include one leg for everything else", () => {
    expect(legs.filter(({ kind }) => kind === "rest")).toHaveLength(1);
  });

  it("are what each runner runs, and a red one leaves the others running", () => {
    const step = job.steps.find(({ run }) => run === "pnpm test:gate");
    expect(step?.env?.GATE_E2E_LEG).toBe("${{ matrix.leg }}");
    expect(job.strategy["fail-fast"]).toBe(false);
  });
});

describe("rendersStory", () => {
  it("is true in exactly one share", () => {
    const shares = ["1/3", "2/3", "3/3"].map(parseLeg);
    for (const id of [
      "components-heading--level-1",
      "gatefixtures-nopill--fail",
      "gatefixtures-textoverflow--spill",
    ]) {
      expect(
        shares.filter((leg) => rendersStory(leg, targets, id)),
        id
      ).toHaveLength(1);
    }
  });

  it("is true for every story when no leg is named", () => {
    expect(
      rendersStory(parseLeg(""), targets, "gatefixtures-nopill--fail")
    ).toBe(true);
  });

  it("throws for a story no target renders", () => {
    expect(() =>
      rendersStory(parseLeg("1/3"), targets, "gatefixtures-gone--fail")
    ).toThrow("gatefixtures-gone--fail");
  });
});
