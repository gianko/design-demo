// @vitest-environment node
// The code step's gate 2 holds a generated screen to ADR 0011: one that keeps
// its own state, or runs a mock operation itself, fails under the rule's id.

import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { codeGates } from "./code-gates.ts";

const repo = resolve(import.meta.dirname, "..");
const file = join(
  repo,
  ".generated/vitest-code-gates/attempt-1-code/Reminder.tsx"
);
const keptAt = "src/screens/reminder/Reminder.tsx";

const gate2 = async (source: string) => {
  const { gates, failures } = await codeGates(file, source, keptAt);
  return {
    result: gates["gate 2"],
    rules: failures
      .filter((failure) => failure.gate === "gate 2")
      .map(({ rule, location }) => `${rule} ${location}`),
  };
};

describe("gate 2's screen-state-via-library", () => {
  it("fails a generated screen that holds its own state", async () => {
    expect(
      await gate2(`import { useState } from "react";
import { Screen, Text } from "../../index.ts";

export function Reminder() {
  const [sent] = useState(false);
  return (
    <Screen audience="contractor">
      <Text text={sent ? "Reminder sent." : "Not sent yet."} />
    </Screen>
  );
}
`)
    ).toEqual({
      result: "fail",
      rules: ["screens/screen-state-via-library L5:18"],
    });
  }, 60_000);

  it("fails a generated screen that calls sendReminder itself", async () => {
    expect(
      await gate2(`import { Screen, Text, useScreenState } from "../../index.ts";

const operations = { sendReminder: async (id: string) => void id };

export function Reminder() {
  const { state } = useScreenState();
  void operations.sendReminder("INV-0142");
  return (
    <Screen audience="contractor">
      <Text text={state} />
    </Screen>
  );
}
`)
    ).toEqual({
      result: "fail",
      rules: ["screens/screen-state-via-library L7:8"],
    });
  }, 60_000);

  it("passes a generated screen that runs its action through useAction", async () => {
    expect(
      await gate2(`import { Screen, Text, useAction, useScreenState } from "../../index.ts";

export function Reminder() {
  const { state } = useScreenState();
  const sendReminder = useAction("sendReminder", {
    success: "reminder-sent",
    failure: "reminder-failed",
  });
  if (state === "default") sendReminder.run("INV-0142");
  return (
    <Screen audience="contractor">
      <Text text={state} />
    </Screen>
  );
}
`)
    ).toEqual({ result: "pass", rules: [] });
  }, 60_000);
});
