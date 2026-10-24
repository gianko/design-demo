// @vitest-environment node
// `pnpm keep <rep dir>` (spec § Keep): a passed rep's final TSX goes to
// src/screens/<slug>/ with one story per declared screen state plus the
// default. Run dirs here are written by hand in the shape generate() leaves.

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { EndReason } from "./generate.ts";
import { pascalCase } from "./screen-stories.ts";
import { main } from "./keep.ts";
import type { UiSpec } from "./ui-spec.ts";
import { repo } from "../repo.ts";

const cleanup: string[] = [];
afterEach(() => {
  for (const path of cleanup.splice(0))
    rmSync(path, { recursive: true, force: true });
});

const tsx = (name: string) => `import { Screen, Text } from "../../index.ts";

export function ${name}() {
  return <Screen audience="contractor"><Text text="Welcome back." /></Screen>;
}
`;

// A rep dir as generate() leaves it, for a fresh slug.
function repDir({
  endReason = "passed",
  states = [],
}: { endReason?: EndReason; states?: UiSpec["states"] } = {}) {
  const id = randomUUID().slice(0, 8);
  const slug = `keep-${id}`;
  const name = pascalCase(slug);
  const dir = join(repo, ".generated", `vitest-keep-${id}`);
  mkdirSync(join(dir, "attempt-1-code"), { recursive: true });
  cleanup.push(dir, join(repo, "src/screens", slug));
  writeFileSync(join(dir, "attempt-1-code", `${name}.tsx`), tsx(name));
  writeFileSync(
    join(dir, "rep.json"),
    JSON.stringify({
      slug,
      workDir: "/somewhere/else",
      outcome: endReason === "passed" ? "pass" : "fail",
      endReason,
      uiSpec: { audience: "contractor", nodes: [], states, actions: [] },
      screen: `attempt-1-code/${name}.tsx`,
      attempts: [],
    })
  );
  return { dir, slug, name: name, kept: join(repo, "src/screens", slug) };
}

async function keep(dir: string) {
  const lines: string[] = [];
  const code = await main([dir], { log: (line) => lines.push(line) });
  return { code, output: lines.join("\n") };
}

describe("pnpm keep", () => {
  it("copies a passed rep's final TSX to src/screens/<slug>/, formatted", async () => {
    const rep = repDir();

    const { code, output } = await keep(rep.dir);

    expect(code).toBe(0);
    expect(readFileSync(join(rep.kept, `${rep.name}.tsx`), "utf8")).toBe(
      `import { Screen, Text } from "../../index.ts";

export function ${rep.name}() {
  return (
    <Screen audience="contractor">
      <Text text="Welcome back." />
    </Screen>
  );
}
`
    );
    expect(output).toContain(`pnpm gate ${rep.slug} --update`);
  });

  it("writes the default story and one per declared screen state, each naming its fixture variant", async () => {
    const rep = repDir({
      states: [
        { name: "empty", fixture: "payment-status/empty" },
        { name: "reminder-sent", fixture: "payment-status/reminder-sent" },
      ],
    });

    await keep(rep.dir);

    const stories = readFileSync(
      join(rep.kept, `${rep.name}.stories.tsx`),
      "utf8"
    );
    expect(stories).toContain(
      `import { ${rep.name} } from "./${rep.name}.tsx";`
    );
    expect(stories).toContain(`title: "Screens/${rep.slug}"`);
    expect(stories).toContain("export const Default: Story = {};");
    expect(stories).toMatch(
      /export const Empty: Story = \{\s*parameters: \{\s*screenState: \{ name: "empty", fixture: "payment-status\/empty" \},?\s*\},?\s*\};/
    );
    expect(stories).toMatch(
      /export const ReminderSent: Story = \{\s*parameters: \{\s*screenState: \{\s*name: "reminder-sent",\s*fixture: "payment-status\/reminder-sent",?\s*\},?\s*\},?\s*\};/
    );
  });

  it("refuses a rep that didn't pass, and writes nothing", async () => {
    const rep = repDir({ endReason: "code-attempts-exhausted" });

    const { code, output } = await keep(rep.dir);

    expect(code).toBe(1);
    expect(output).toMatch(/code-attempts-exhausted/);
    expect(existsSync(rep.kept)).toBe(false);
  });

  it("refuses to overwrite a kept screen", async () => {
    const rep = repDir();
    mkdirSync(rep.kept, { recursive: true });
    writeFileSync(join(rep.kept, "Mine.tsx"), "// kept by hand\n");

    const { code, output } = await keep(rep.dir);

    expect(code).toBe(1);
    expect(output).toMatch(/already kept/);
    expect(existsSync(join(rep.kept, `${rep.name}.tsx`))).toBe(false);
  });
});
