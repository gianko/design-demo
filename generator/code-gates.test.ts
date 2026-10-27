// @vitest-environment node
// The code step's gate 2 holds a generated screen to ADR 0011: one that keeps
// its own state, or runs a mock operation itself, fails under the rule's id.
// A screen that wires an action passes, along with the UI spec it came from.

import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { codeGates } from "./code-gates.ts";
import { gate1 } from "./gate1.ts";
import { loadRegistry } from "./registry.ts";
import {
  fixtureVariant,
  operationNames,
  variantNames,
} from "../src/fixtures/fixtures.ts";
import { repo } from "../repo.ts";

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

  // The host holds the selection (ADR 0011, #188), so reading it isn't the
  // screen holding state.
  it("passes a generated screen that pays the selection from useSelectedRows", async () => {
    const { gates } = await codeGates(
      file,
      `import {
  Button,
  DataTable,
  Screen,
  Text,
  useAction,
  useFixtureData,
  useScreenState,
  useSelectedRows,
} from "../../index.ts";

export function Reminder() {
  const data = useFixtureData();
  const selected = useSelectedRows();
  const { state } = useScreenState();
  const approveAndPay = useAction("payInvoices", {
    success: "payment-scheduled",
    failure: "payment-failed",
  });
  return (
    <Screen audience="admin">
      {state === "rows-selected" && (
        <Button
          text="Approve and pay"
          intent="primary"
          pending={approveAndPay.pending}
          onClick={() => approveAndPay.run(selected)}
        />
      )}
      <DataTable
        rows={data.invoices}
        columns={["Invoice"]}
        selectable
        cell={(row) => <Text text={row.number} />}
      />
    </Screen>
  );
}
`,
      keptAt
    );

    expect([gates["gate 2"], gates["gate 3"]]).toEqual(["pass", "pass"]);
  }, 60_000);
});

// Button's pending is code-only (ADR 0011): the UI spec names the pending
// node through actions[].pending and gives no pending prop, and the code step
// sets it from useAction. Both halves pass their gates against the real
// registry and fixtures.
describe("a generated screen that wires an action", () => {
  const uiSpec = {
    audience: "contractor",
    nodes: [
      {
        id: "screen",
        component: "Screen",
        parent: null,
        slot: null,
        props: [{ name: "audience", value: '"contractor"' }],
        when: [],
        action: null,
      },
      {
        id: "remind-button",
        component: "Button",
        parent: "screen",
        slot: "body",
        props: [
          { name: "text", value: '"Send reminder"' },
          { name: "intent", value: '"primary"' },
        ],
        when: [],
        action: "remind",
      },
    ],
    states: [
      { name: "reminder-sent", fixture: "payment-status/reminder-sent" },
      { name: "reminder-failed", fixture: "payment-status/reminder-failed" },
    ],
    actions: [
      {
        name: "remind",
        operation: "sendReminder",
        pending: "remind-button",
        to: { success: "reminder-sent", failure: "reminder-failed" },
      },
    ],
  };

  it("passes gate 1 with a Button as its pending node and no pending prop", async () => {
    const { entries } = await loadRegistry();

    expect(
      gate1(JSON.stringify(uiSpec), {
        entries,
        audience: "contractor",
        fixtures: {
          variants: Object.fromEntries(
            variantNames.map((name) => [name, fixtureVariant(name).data])
          ),
          operations: operationNames,
        },
      })
    ).toEqual([]);
  });

  it("passes gates 2 and 3 with its Button's pending set from useAction", async () => {
    const { gates } = await codeGates(
      file,
      `import { Button, Screen, useAction, useFixtureData } from "../../index.ts";

export function Reminder() {
  const data = useFixtureData();
  const sendReminder = useAction("sendReminder", {
    success: "reminder-sent",
    failure: "reminder-failed",
  });
  return (
    <Screen audience="contractor">
      {data.overdueInvoice && (
        <Button
          text="Send reminder"
          intent="primary"
          pending={sendReminder.pending}
          onClick={() => sendReminder.run(data.overdueInvoice!.id)}
        />
      )}
    </Screen>
  );
}
`,
      keptAt
    );

    expect([gates["gate 2"], gates["gate 3"]]).toEqual(["pass", "pass"]);
  }, 60_000);
});

// A failure line names its gate as the attempt's results do, so a repair
// turn's `gate 7 static` lines match the `gate 7 static` result (ADR 0010).
describe("codeGates", () => {
  it("names each failure by the gate its result is recorded under", async () => {
    const { gates, failures } = await codeGates(
      file,
      `import { Screen, Text } from "../../index.ts";

export function Reminder() {
  return (
    <Screen audience="contractor">
      <span className="rounded-full">Paid</span>
      <Text text={42} />
    </Screen>
  );
}
`,
      keptAt
    );

    const failed = Object.entries(gates)
      .filter(([, result]) => result === "fail")
      .map(([gate]) => gate);
    expect(failed).toEqual(["gate 2", "gate 3", "gate 7 static"]);
    expect([...new Set(failures.map(({ gate }) => gate))].sort()).toEqual(
      failed
    );
  }, 60_000);
});
