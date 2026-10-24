// @vitest-environment node

// Token lint (gate 2) is a config of other people's rules plus one of ours
// (ADR 0002), so a plugin upgrade could quietly open a hole. These tests lint
// planted fixtures with the repo's real ESLint config and pin every finding.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../..");
// Generator output is ignored by `pnpm lint`, so the generator lints it with
// ignores off, as this does.
const eslint = new ESLint({ cwd: repo, ignore: false });

type Finding = [rule: string | null, source: string];

// Lints a fixture as if it sat at `plantedAt`, since the rules a file gets
// depend on where it lives. Each finding is its rule and the source it flags.
async function lint(fixture: string, plantedAt: string): Promise<Finding[]> {
  const code = readFileSync(
    join(import.meta.dirname, "fixtures", fixture),
    "utf8"
  );
  const [result] = await eslint.lintText(code, {
    filePath: join(repo, plantedAt),
  });
  const lines = code.split("\n");
  // Taste lint (gate 7) may flag the same planted lines; its own tests pin
  // those findings.
  const gate2 = result!.messages.filter(
    (message) => !message.ruleId?.startsWith("taste/")
  );
  return gate2.map((message) => [
    message.ruleId,
    message.endLine === message.line
      ? lines[message.line - 1]!.slice(
          message.column - 1,
          message.endColumn! - 1
        )
      : message.message,
  ]);
}

describe("token lint", () => {
  it("finds nothing in a library component drawn only from tokens", async () => {
    expect(await lint("clean.tsx", "src/fixture/Clean.tsx")).toEqual([]);
  });

  it("finds every planted violation in a library component, and nothing else", async () => {
    expect(
      await lint("library-violations.tsx", "src/fixture/Violations.tsx")
    ).toEqual([
      ["better-tailwindcss/no-restricted-classes", "hover:bg-[#fff]"],
      ["better-tailwindcss/no-unknown-classes", "bg-ink"],
      ["better-tailwindcss/no-unknown-classes", "text-surface"],
      ["better-tailwindcss/no-unknown-classes", "border-ink"],
      ["better-tailwindcss/no-unknown-classes", "ring-line"],
      ["better-tailwindcss/no-restricted-classes", "[color:#f00]"],
      ["better-tailwindcss/no-restricted-classes", "p-(--gutter)!"],
      ["better-tailwindcss/no-restricted-classes", "data-[state=open]:-z-10"],
      ["better-tailwindcss/no-restricted-classes", "h-px"],
      ["better-tailwindcss/no-restricted-classes", "bg-accent/50"],
      ["better-tailwindcss/no-restricted-classes", "opacity-0"],
      ["better-tailwindcss/no-concatenated-classes", "gap-"],
      ["no-restricted-syntax", `style={{ color: "var(--ds-color-text-ink)" }}`],
      ["no-restricted-syntax", `stopColor="plum"`],
      ["no-restricted-syntax", `fill={"#ff0000"}`],
    ]);
  });

  it("finds nothing in CSS drawn only from tokens", async () => {
    expect(await lint("clean.css", "src/fixture/fixture.css")).toEqual([]);
  });

  it("finds every raw value planted in CSS, and nothing else", async () => {
    const rule = "token/no-raw-css-values";
    expect(await lint("violations.css", "src/fixture/fixture.css")).toEqual([
      [rule, "13px"],
      [rule, "#fff"],
      [rule, "rgb(0 0 0)"],
      [rule, "white"],
      [rule, "13px"],
      [rule, "1px"],
      [rule, "#2a1f2d1f"],
      [rule, "Inter"],
      [rule, "700"],
      [rule, "1.5"],
      [rule, "0.02em"],
      [rule, "50"],
      [rule, "0.5"],
      [rule, "ease-in-out"],
      [rule, "cubic-bezier(0.2, 0, 0, 1)"],
      [rule, "bg-accent/50"],
      [rule, "p-[13px]"],
    ]);
  });

  // A kept screen, a stand-alone generator run and an eval run (ADR 0010).
  describe.each([
    "src/screens/fixture/Fixture.tsx",
    ".generated/20261023-fixture/attempt-1-code/Fixture.tsx",
    "evals/runs/fixture/attempt-1-code/Fixture.tsx",
  ])("in a generated screen at %s", (plantedAt) => {
    it("finds nothing in a screen built from the barrel", async () => {
      expect(await lint("screen-clean.tsx", plantedAt)).toEqual([]);
    });

    it("finds every planted violation, and nothing else", async () => {
      expect(await lint("screen-violations.tsx", plantedAt)).toEqual([
        ["no-restricted-imports", `import { Dialog } from "radix-ui";`],
        [
          "no-restricted-imports",
          `import * as Popover from "@radix-ui/react-popover";`,
        ],
        [
          "no-restricted-imports",
          `import { Amount } from "../../components/Amount/Amount.tsx";`,
        ],
        ["no-restricted-syntax", "<span>"],
        ["no-restricted-syntax", `createElement("hr")`],
      ]);
    });

    it("finds every change of state outside the library, and a screen hosting itself, and nothing else", async () => {
      const rule = "screens/screen-state-via-library";
      expect(await lint("screen-state-violations.tsx", plantedAt)).toEqual([
        [rule, "useState as useLocalState"],
        [
          "no-restricted-imports",
          `import { fixtureVariant } from "../../fixtures/fixtures.ts";`,
        ],
        [rule, "sendReminder: remind"],
        [rule, "React.useState"],
        [rule, "useReducer"],
        [rule, "document.startViewTransition"],
        [rule, "operations.sendReminder"],
        [rule, `operations["sendReminder"]`],
        [rule, "Library.ScreenHost"],
      ]);
    });
  });
});
