// @vitest-environment node
// The code step's render pass (ADR 0008, ADR 0010): a generated screen that
// builds renders in light and dark × the default and every declared screen
// state, at its audience's density, under gate 4 and the render-time taste
// rules. It runs the real Storybook build and the Playwright pass in the
// pinned image, so these tests are slow and need Docker.

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { failureLine } from "./failure.ts";
import { renderGates } from "./render-gates.ts";

const repo = resolve(import.meta.dirname, "..");

const smokeTsx = `import { Screen, Text } from "../../index.ts";

export function Smoke() {
  return (
    <Screen audience="contractor">
      <Text text="Welcome back. Your invoices and payments will show up here." />
    </Screen>
  );
}
`;

const dirs: string[] = [];
function attemptDir() {
  const dir = join(repo, ".generated", `vitest-${randomUUID()}`, "attempt");
  mkdirSync(dir, { recursive: true });
  dirs.push(resolve(dir, ".."));
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

const screen = (
  source: string,
  states: { name: string; fixture: string }[]
) => ({
  dir: attemptDir(),
  slug: "smoke",
  name: "Smoke",
  source,
  audience: "contractor" as const,
  states,
});

describe("renderGates", () => {
  it("passes a clean screen in light and dark × every screen state, at its audience's density", async () => {
    const result = await renderGates(
      screen(smokeTsx, [
        { name: "reminder-sent", fixture: "payment-status/reminder-sent" },
      ])
    );

    expect(result.failures).toEqual([]);
    expect(result.gates).toEqual({ "gate 4": "pass", "gate 7 render": "pass" });
    expect(result.renders).toEqual(
      expect.arrayContaining(
        [
          ["light", "default"],
          ["dark", "default"],
          ["light", "reminder-sent"],
          ["dark", "reminder-sent"],
        ].map(([theme, state]) => ({
          theme,
          density: "contractor",
          state,
          gates: { "gate 4": "pass", "gate 7 render": "pass" },
        }))
      )
    );
    expect(result.renders).toHaveLength(4);
  }, 120_000);

  // Planted with intrinsic elements, which gate 2 fails on its own, so
  // these renders fail only gate 4 and only gate 7 respectively.
  it("names each gate 4 and render-time taste failure with its rule, element and theme × screen state", async () => {
    const tsx = `import { Screen } from "../../index.ts";

export function Smoke() {
  return (
    <Screen audience="contractor">
      <button type="button"></button>
      <p style={{ fontSize: 13 }}>Off the type scale</p>
    </Screen>
  );
}
`;
    const result = await renderGates(
      screen(tsx, [{ name: "empty", fixture: "payment-status/empty" }])
    );

    expect(result.gates).toEqual({ "gate 4": "fail", "gate 7 render": "fail" });
    expect(
      result.renders.map(({ theme, state, gates }) => [theme, state, gates])
    ).toEqual(
      expect.arrayContaining(
        ["light", "dark"].flatMap((theme) =>
          ["default", "empty"].map((state) => [
            theme,
            state,
            { "gate 4": "fail", "gate 7 render": "fail" },
          ])
        )
      )
    );
    const lines = result.failures.map(failureLine);
    for (const where of [
      "light · default",
      "dark · default",
      "light · empty",
      "dark · empty",
    ]) {
      expect(lines).toContainEqual(
        `gate 4 · button-name · button[type="button"] <button type="button"></button> · Buttons must have discernible text (in ${where})`
      );
      expect(lines).toContainEqual(
        `gate 7 · type-on-scale · (render) · "Off the type scale" is set at 13px. (in ${where})`
      );
    }
  }, 120_000);

  it("records both render gates as not-run when the screen doesn't build", async () => {
    const tsx = smokeTsx.replace(
      'from "../../index.ts"',
      'from "../../no-such-module.ts"'
    );
    const dir = attemptDir();

    const result = await renderGates({ ...screen(tsx, []), dir });

    expect(result.built).toBe(false);
    expect(result.gates).toEqual({
      "gate 4": "not-run",
      "gate 7 render": "not-run",
    });
    expect(result.renders).toEqual([]);
    expect(result.failures).toEqual([
      expect.objectContaining({ gate: "gate 3", rule: "build" }),
    ]);
    expect(existsSync(join(dir, "render/out"))).toBe(false);
  }, 120_000);

  it("fails a render that throws as script-error", async () => {
    const tsx = `import { Screen } from "../../index.ts";

export function Smoke(): React.ReactNode {
  throw new Error("The screen broke.");
  return <Screen audience="contractor" />;
}
`;
    const result = await renderGates(screen(tsx, []));

    expect(result.gates["gate 7 render"]).toBe("fail");
    expect(result.failures.map(failureLine)).toContainEqual(
      expect.stringMatching(
        /^gate 7 · script-error · \(render\) · .*The screen broke\..* \(in light · default\)$/
      )
    );
  }, 120_000);
});
