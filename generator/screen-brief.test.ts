// @vitest-environment node
// The payment-status screen brief (spec § The screen brief): its frontmatter
// pass criteria and its screen-state table are the spec's, and each state's
// fixture variant is one the fixtures module has.

import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fixtureVariant } from "../src/fixtures/fixtures.ts";
import { readScreenBrief } from "./screen-brief.ts";

const brief = readScreenBrief(
  join(import.meta.dirname, "../evals/briefs/payment-status.md")
);

// The screen-state table's rows as { state, fixture, shows }, backticks off
// the state id and the fixture cell reduced to its variant name.
function stateTable(text: string) {
  return text
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .slice(2)
    .map((line) => {
      const [state, fixture, shows] = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      return {
        state: state!.replaceAll("`", ""),
        fixture: /`([^`]+)`/.exec(fixture!)?.[1],
        shows: shows!,
      };
    });
}

describe("the payment-status screen brief", () => {
  it("carries the spec's audience and pass criteria", () => {
    expect(brief).toMatchObject({
      slug: "payment-status",
      audience: "contractor",
      requires: {
        components: ["Screen", "Card", "StatusTag", "Amount", "Button"],
        states: ["empty", "reminder-sent", "reminder-failed"],
        actions: ["send-reminder"],
      },
    });
  });

  it("tables the default and each required state, with its fixture variant", () => {
    expect(
      stateTable(brief.text).map(({ state, fixture }) => [state, fixture])
    ).toEqual([
      ["default", "default"],
      ["empty", "payment-status/empty"],
      ["reminder-sent", "payment-status/reminder-sent"],
      ["reminder-failed", "payment-status/reminder-failed"],
    ]);
  });

  it("names only fixture variants the fixtures module has", () => {
    for (const { fixture } of stateTable(brief.text)) {
      expect(fixtureVariant(fixture!).name).toBe(fixture);
    }
  });

  it("says what shows in each state as the spec does", () => {
    expect(
      Object.fromEntries(
        stateTable(brief.text).map(({ state, shows }) => [state, shows])
      )
    ).toEqual({
      default: "the card, the Button enabled",
      empty: '"No invoices yet" and what happens when one is sent',
      "reminder-sent":
        'the card, and a live Text: "Reminder sent to Northwind. We\'ll tell you when they pay."',
      "reminder-failed":
        "the card, a live Text saying what happened and what to do next, the Button still there",
    });
  });
});
