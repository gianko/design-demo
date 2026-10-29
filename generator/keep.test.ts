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
  nodes = [],
  actions = [],
}: { endReason?: EndReason } & Partial<
  Pick<UiSpec, "states" | "nodes" | "actions">
> = {}) {
  const id = randomUUID().slice(0, 8);
  const slug = `keep-${id}`;
  const name = pascalCase(slug);
  const root = join(repo, ".generated", `vitest-keep-${id}`);
  const dir = join(root, "rep");
  // Kept screens go under the git-ignored root, never src/ (vitest.src-guard.ts),
  // still inside the repo so they're formatted with its Prettier config.
  const screensDir = join(root, "src", "screens");
  mkdirSync(join(dir, "attempt-1-code"), { recursive: true });
  mkdirSync(screensDir, { recursive: true });
  // A kept screen imports the library as ../../index.ts.
  writeFileSync(
    join(root, "src", "index.ts"),
    `export * from ${JSON.stringify(join(repo, "src", "index.ts"))};\n`
  );
  cleanup.push(root);
  writeFileSync(join(dir, "attempt-1-code", `${name}.tsx`), tsx(name));
  writeFileSync(
    join(dir, "rep.json"),
    JSON.stringify({
      slug,
      workDir: "/somewhere/else",
      outcome: endReason === "passed" ? "pass" : "fail",
      endReason,
      uiSpec: { audience: "contractor", nodes, states, actions },
      screen: `attempt-1-code/${name}.tsx`,
      attempts: [],
    })
  );
  return { dir, slug, name: name, screensDir, kept: join(screensDir, slug) };
}

async function keep({ dir, screensDir }: ReturnType<typeof repDir>) {
  const lines: string[] = [];
  const code = await main([dir], {
    log: (line) => lines.push(line),
    screensDir,
  });
  return { code, output: lines.join("\n") };
}

describe("pnpm keep", () => {
  it("copies a passed rep's final TSX to src/screens/<slug>/, formatted", async () => {
    const rep = repDir();

    const { code, output } = await keep(rep);

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

    await keep(rep);

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

  it("declares each action on the default story: its Button's label, the state it's clicked in, and each outcome's state and variant", async () => {
    const node = (
      id: string,
      parent: string | null,
      when: string[],
      { action = null, text }: { action?: string | null; text?: string } = {}
    ): UiSpec["nodes"][number] => ({
      id,
      component: text === undefined ? "Stack" : "Button",
      parent,
      slot: parent && "children",
      props: text === undefined ? [] : [{ name: "text", value: text }],
      when,
      action,
    });
    const rep = repDir({
      nodes: [
        node("screen", null, []),
        node("remind", "screen", ["default", "reminder-failed"], {
          action: "send-reminder",
          text: '"Send reminder"',
        }),
        node("retry-bar", "screen", ["reminder-failed"]),
        node("retry", "retry-bar", [], {
          action: "retry",
          text: '{"bind":"overdueInvoice.number"}',
        }),
      ],
      states: [
        { name: "empty", fixture: "payment-status/empty" },
        { name: "reminder-sent", fixture: "payment-status/reminder-sent" },
        { name: "reminder-failed", fixture: "payment-status/reminder-failed" },
      ],
      actions: [
        {
          name: "send-reminder",
          operation: "sendReminder",
          pending: "remind",
          to: { success: "reminder-sent", failure: "reminder-failed" },
        },
        {
          name: "retry",
          operation: "sendReminder",
          pending: "retry",
          to: { success: "reminder-sent", failure: "reminder-failed" },
        },
      ],
    });

    await keep(rep);

    const stories = await import(join(rep.kept, `${rep.name}.stories.tsx`));
    const sent = {
      name: "reminder-sent",
      fixture: "payment-status/reminder-sent",
    };
    const failed = {
      name: "reminder-failed",
      fixture: "payment-status/reminder-failed",
    };
    expect(stories.Default.parameters.screenActions).toEqual([
      {
        name: "send-reminder",
        label: "Send reminder",
        from: "default",
        to: { success: sent, failure: failed },
      },
      {
        name: "retry",
        label: null,
        from: "reminder-failed",
        to: { success: sent, failure: failed },
      },
    ]);
    expect(stories.Empty.parameters.screenActions).toBeUndefined();
  });

  // So a confirmed action shows the data of the state it enters in every
  // story (ADR 0011, the stagger): the preview hands them to ScreenHost.
  it("gives every story the declared states, each with its fixture variant", async () => {
    const rep = repDir({
      states: [
        { name: "empty", fixture: "bulk-pay/empty" },
        { name: "payment-scheduled", fixture: "bulk-pay/payment-scheduled" },
      ],
    });

    await keep(rep);

    const stories = readFileSync(
      join(rep.kept, `${rep.name}.stories.tsx`),
      "utf8"
    );
    expect(stories).toMatch(
      /const meta = \{[^;]*parameters: \{\s*screenStates: \[\s*\{ name: "empty", fixture: "bulk-pay\/empty" \},\s*\{\s*name: "payment-scheduled",\s*fixture: "bulk-pay\/payment-scheduled",?\s*\},?\s*\],?\s*\},?\s*\} satisfies Meta/
    );
  });

  // ADR 0011: the open-sheet render, the default state with the first row's
  // Sheet open, one per DataTable with a detail slot, counted in document
  // order among the tables the default state shows. Full window, as a
  // modal Sheet covers it.
  it("writes an open-sheet story for each DataTable with a detail slot the default state shows, and none for a table without one", async () => {
    const node = (
      id: string,
      component: string,
      parent: string | null,
      slot: string | null,
      when: string[] = []
    ): UiSpec["nodes"][number] => ({
      id,
      component,
      parent,
      slot,
      props: [],
      when,
      action: null,
    });
    const rep = repDir({
      nodes: [
        node("screen", "Screen", null, null),
        node("plain", "DataTable", "screen", "body"),
        node("plain-cell", "Text", "plain", "cell"),
        node("hidden", "DataTable", "screen", "body", ["paid"]),
        node("hidden-detail", "Sheet", "hidden", "detail"),
        node("stack", "Stack", "screen", "body"),
        node("invoices", "DataTable", "stack", "children"),
        node("invoice", "Sheet", "invoices", "detail"),
        node("payments", "DataTable", "screen", "body"),
        node("payment", "Sheet", "payments", "detail"),
      ],
      states: [{ name: "paid", fixture: "payment-status/reminder-sent" }],
    });

    await keep(rep);

    const stories = await import(join(rep.kept, `${rep.name}.stories.tsx`));
    expect(stories.DefaultSheetOpen.parameters).toEqual({
      layout: "fullscreen",
      openSheet: 0,
    });
    expect(stories.DefaultSheet2Open.parameters).toEqual({
      layout: "fullscreen",
      openSheet: 1,
    });
    expect(
      Object.keys(stories).filter((name) => name.startsWith("DefaultSheet"))
    ).toHaveLength(2);
  });

  // ADR 0013: the rows-ticked render, the default state with every row of a
  // table with actions ticked, one per such table the default state shows,
  // counted in document order.
  it("writes a rows-ticked story for each DataTable with actions the default state shows", async () => {
    const node = (
      id: string,
      component: string,
      parent: string | null,
      slot: string | null,
      when: string[] = []
    ): UiSpec["nodes"][number] => ({
      id,
      component,
      parent,
      slot,
      props: [],
      when,
      action: null,
    });
    const rep = repDir({
      nodes: [
        node("screen", "Screen", null, null),
        node("plain", "DataTable", "screen", "body"),
        node("hidden", "DataTable", "screen", "body", ["paid"]),
        node("hidden-pay", "Button", "hidden", "actions"),
        node("invoices", "DataTable", "screen", "body"),
        node("invoice-pay", "Button", "invoices", "actions"),
      ],
      states: [{ name: "paid", fixture: "payment-status/reminder-sent" }],
    });

    await keep(rep);

    const stories = await import(join(rep.kept, `${rep.name}.stories.tsx`));
    expect(stories.DefaultRowsTicked.parameters).toEqual({ tickRows: 0 });
    expect(
      Object.keys(stories).filter((name) => name.startsWith("DefaultRows"))
    ).toEqual(["DefaultRowsTicked"]);
  });

  it("writes no open-sheet story when no DataTable has a detail slot", async () => {
    const rep = repDir({
      nodes: [
        {
          id: "screen",
          component: "Screen",
          parent: null,
          slot: null,
          props: [],
          when: [],
          action: null,
        },
      ],
    });

    await keep(rep);

    const stories = await import(join(rep.kept, `${rep.name}.stories.tsx`));
    expect(Object.keys(stories).sort()).toEqual(["Default", "default"]);
  });

  it("refuses a rep that didn't pass, and writes nothing", async () => {
    const rep = repDir({ endReason: "code-attempts-exhausted" });

    const { code, output } = await keep(rep);

    expect(code).toBe(1);
    expect(output).toMatch(/code-attempts-exhausted/);
    expect(existsSync(rep.kept)).toBe(false);
  });

  it("refuses to overwrite a kept screen", async () => {
    const rep = repDir();
    mkdirSync(rep.kept, { recursive: true });
    writeFileSync(join(rep.kept, "Mine.tsx"), "// kept by hand\n");

    const { code, output } = await keep(rep);

    expect(code).toBe(1);
    expect(output).toMatch(/already kept/);
    expect(existsSync(join(rep.kept, `${rep.name}.tsx`))).toBe(false);
  });
});
