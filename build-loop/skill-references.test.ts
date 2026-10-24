import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { animatesWhileIdle, shots } from "../gates/stories.ts";
import { brokenReferences } from "./skill-references.ts";
import { repo } from "../repo.ts";

describe("the build-component skill", () => {
  const skill = readFileSync(
    join(repo, ".claude/skills/build-component/SKILL.md"),
    "utf8"
  );

  test("names only repo paths and scripts that exist", () => {
    expect(
      brokenReferences(skill, repo, {
        "gates/out/contact-sheet/": [
          "gates/playwright.config.ts",
          "out/contact-sheet",
        ],
        // The first component's session creates it.
        "src/components/": ["docs/spec.md", "src/components/<Name>/"],
      })
    ).toEqual([]);
  });

  // The critique opens each shot by name, so a shot the gate adds or renames
  // would go unread.
  test("names every shot the gate takes, and the tag that adds one", () => {
    for (const name of [...shots, animatesWhileIdle]) {
      expect(skill).toContain(`\`${name}\``);
    }
  });
});

describe("brokenReferences", () => {
  const repo = mkdtempSync(join(tmpdir(), "skill-references-"));
  mkdirSync(join(repo, "lint/taste"), { recursive: true });
  writeFileSync(join(repo, "lint/taste/RULES.md"), "");
  mkdirSync(join(repo, "gates"));
  writeFileSync(
    join(repo, "gates/playwright.config.ts"),
    'outputFolder: "out/contact-sheet"'
  );
  writeFileSync(
    join(repo, "package.json"),
    JSON.stringify({ scripts: { gate: "node gates/run.ts" } })
  );
  const outputs = {
    "gates/out/contact-sheet/": [
      "gates/playwright.config.ts",
      "out/contact-sheet",
    ] as const,
  };

  test("passes paths that exist, outputs their file mentions, and real scripts", () => {
    const skill =
      "Read `lint/taste/RULES.md` and `lint/`, run `pnpm gate $ARGUMENTS`, open `gates/out/contact-sheet/`, write `src/components/$ARGUMENTS/PLAN.md`, branch off `origin/main`.";
    expect(brokenReferences(skill, repo, outputs)).toEqual([]);
  });

  test("names a path whose folder exists but whose file doesn't", () => {
    expect(
      brokenReferences("Read `lint/taste/RULE.md`.", repo, outputs)
    ).toEqual(["lint/taste/RULE.md: no such path"]);
  });

  test("names an output its writer no longer mentions", () => {
    const moved = {
      "gates/out/shots/": ["gates/playwright.config.ts", "out/shots"] as const,
    };
    expect(brokenReferences("Open `gates/out/shots/`.", repo, moved)).toEqual([
      "gates/out/shots/: gates/playwright.config.ts doesn't mention out/shots",
    ]);
  });

  test("names a pnpm script package.json doesn't define", () => {
    expect(brokenReferences("Run `pnpm gates Button`.", repo, outputs)).toEqual(
      ["pnpm gates: no such script"]
    );
  });
});
