// @vitest-environment node
// The static taste rules, run through the repo's own ESLint config over the
// fixtures in lint/taste/fixtures. Each failing fixture marks every line it
// expects a finding on with `✗ taste/<rule>` (or the inline opt-out ban's
// `✗ taste-exemptions/no-inline-disable`), so the test holds the rule to
// exactly those findings; each passing fixture must produce none.

import { ESLint } from "eslint";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { staticRules } from "./rules/index.ts";
import { repo } from "../../repo.ts";

const fixtures = resolve(import.meta.dirname, "fixtures");

// The fixtures are ignored by the config, so `pnpm lint` stays clean; the
// test lints them on purpose.
const eslint = new ESLint({ cwd: repo, ignore: false });

// The taste findings, and anything that isn't a rule's (a parse error). The
// fixtures plant raw values too, which are token lint's to report (gate 2).
async function findings(file: string) {
  const [result] = await eslint.lintFiles([resolve(fixtures, file)]);
  return result!.messages
    .filter((message) => !message.ruleId?.startsWith("token/"))
    .map((message) => `${message.line} ${message.ruleId ?? message.message}`);
}

function expected(file: string) {
  return readFileSync(resolve(fixtures, file), "utf8")
    .split("\n")
    .flatMap((line, i) =>
      [...line.matchAll(/✗ (taste(?:-exemptions)?\/[a-z-]+)/g)].map(
        (match) => `${i + 1} ${match[1]}`
      )
    );
}

// The file types a rule has fixtures for. Most rules read both; one that only
// TSX can break (a JSX `<Card>` in a `<Card>`) has no CSS fixtures.
function extensions(rule: string) {
  return ["tsx", "css"].filter((extension) =>
    existsSync(resolve(fixtures, `${rule}.fail.${extension}`))
  );
}

describe.each(staticRules.map((rule) => rule.id))("taste/%s", (rule) => {
  it("has fixtures", () => {
    expect(extensions(rule)).not.toEqual([]);
  });

  describe.each(extensions(rule))("in .%s", (extension) => {
    const fail = `${rule}.fail.${extension}`;
    const pass = `${rule}.pass.${extension}`;

    it("reports every planted violation, and nothing else", async () => {
      const marked = expected(fail);
      expect(marked.length).toBeGreaterThan(0);
      expect((await findings(fail)).sort()).toEqual(marked.sort());
    });

    it("passes a clean file", async () => {
      expect(await findings(pass)).toEqual([]);
    });
  });
});

describe("exemptions", () => {
  it.each(["tsx", "css"])(
    "are never inline: an opt-out that silences a taste rule fails in .%s",
    async (extension) => {
      const fail = `no-inline-disable.fail.${extension}`;
      const marked = expected(fail);
      expect(marked.length).toBeGreaterThan(0);
      expect((await findings(fail)).sort()).toEqual(marked.sort());
    }
  );

  // A library component lives in `src/components/<Name>/` (docs/spec.md
  // § Component pieces), so the fixture is linted there.
  const plantedAt = async (path: string) => {
    const code = readFileSync(resolve(fixtures, "Avatar.tsx"), "utf8");
    const [result] = await eslint.lintText(code, {
      filePath: resolve(repo, path),
    });
    return result!.messages
      .filter((message) => message.ruleId?.startsWith("taste/"))
      .map((message) => message.ruleId);
  };

  it("lets a component the config exempts from no-pill be fully rounded", async () => {
    expect(await plantedAt("src/components/Avatar/Avatar.tsx")).toEqual([]);
  });

  it("holds any other component to no-pill", async () => {
    expect(await plantedAt("src/components/StatusTag/Avatar.tsx")).toEqual([
      "taste/no-pill",
    ]);
  });
});
