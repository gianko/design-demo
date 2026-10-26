// @vitest-environment node
// The eval screen briefs (spec § Eval screen briefs): the P0 five carry the
// spec's audience and pass criteria, and every file in evals/briefs/ parses
// as a screen brief, names each id its pass criteria check verbatim, and
// tables each screen state with a fixture variant the fixtures module has.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fixtureVariant } from "../src/fixtures/fixtures.ts";
import { readScreenBrief } from "./screen-brief.ts";

const briefsDir = join(import.meta.dirname, "../evals/briefs");
const briefFiles = readdirSync(briefsDir).filter((file) =>
  file.endsWith(".md")
);

function brief(file: string) {
  return readScreenBrief(join(briefsDir, file));
}

// The brief without its frontmatter, where the pass criteria already list
// every id.
function body(text: string) {
  return text.replace(/^---\n[\s\S]*?\n---\n/, "");
}

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

// Spec § The P0 five, its pass-criteria table.
const p0Five = [
  {
    slug: "payment-status",
    audience: "contractor",
    requires: {
      components: ["Screen", "Card", "StatusTag", "Amount", "Button"],
      states: ["empty", "reminder-sent", "reminder-failed"],
      actions: ["send-reminder"],
    },
  },
  {
    slug: "payment-overview",
    audience: "contractor",
    requires: {
      components: ["Screen", "Heading", "Card", "Amount", "StatusTag"],
      states: ["empty"],
      actions: [],
    },
  },
  {
    slug: "invoice-queue",
    audience: "admin",
    requires: {
      components: [
        "Screen",
        "PageHeader",
        "DataTable",
        "StatusTag",
        "Amount",
        "Button",
      ],
      states: ["empty", "rows-selected", "payment-scheduled", "payment-failed"],
      actions: ["approve-and-pay"],
    },
  },
  {
    slug: "invoice-review",
    audience: "admin",
    requires: {
      components: [
        "Screen",
        "PageHeader",
        "Card",
        "Amount",
        "StatusTag",
        "Button",
      ],
      states: ["payment-scheduled", "payment-failed"],
      actions: ["approve-and-pay"],
    },
  },
  {
    slug: "payment-run",
    audience: "admin",
    requires: {
      components: ["Screen", "PageHeader", "Card", "Amount", "StatusTag"],
      states: ["empty"],
      actions: [],
    },
  },
];

describe("the P0 five", () => {
  it.each(p0Five)(
    "$slug carries the spec's audience and pass criteria",
    (expected) => {
      expect(brief(`${expected.slug}.md`)).toMatchObject(expected);
    }
  );
});

describe.each(briefFiles)("the screen brief %s", (file) => {
  it("parses as a screen brief", () => {
    expect(brief(file).slug).toBe(file.replace(/\.md$/, ""));
  });

  it("names every state and action id its pass criteria check, verbatim", () => {
    const { requires, text } = brief(file);
    const ids = [...requires.states, ...requires.actions];
    expect(ids.filter((id) => !body(text).includes(`\`${id}\``))).toEqual([]);
  });

  it("tables the default and each required state", () => {
    const { requires, text } = brief(file);
    expect(stateTable(text).map(({ state }) => state)).toEqual([
      "default",
      ...requires.states,
    ]);
  });

  it("names a fixture variant the fixtures module has for each state", () => {
    for (const { state, fixture } of stateTable(brief(file).text)) {
      expect(fixture, `${state}'s fixture variant`).toBeDefined();
      expect(fixtureVariant(fixture!).name).toBe(fixture);
    }
  });
});

describe("the payment-status screen brief", () => {
  it("tables each state's fixture variant", () => {
    expect(
      stateTable(brief("payment-status.md").text).map(({ state, fixture }) => [
        state,
        fixture,
      ])
    ).toEqual([
      ["default", "default"],
      ["empty", "payment-status/empty"],
      ["reminder-sent", "payment-status/reminder-sent"],
      ["reminder-failed", "payment-status/reminder-failed"],
    ]);
  });

  it("says what shows in each state as the spec does", () => {
    expect(
      Object.fromEntries(
        stateTable(brief("payment-status.md").text).map(({ state, shows }) => [
          state,
          shows,
        ])
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
