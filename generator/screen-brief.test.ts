// @vitest-environment node
// The eval screen briefs (spec § Eval screen briefs): the P0 five and the P1
// briefs carry the spec's audience and pass criteria, and every file in evals/briefs/ parses
// as a screen brief, names each id its pass criteria check verbatim, and
// tables each screen state with a fixture variant the fixtures module has.
// Together they meet the coverage rule (GLOSSARY.md).

import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { densities } from "../.storybook/globals.ts";
import { repo } from "../repo.ts";
import { fixtureVariant, type Operations } from "../src/fixtures/fixtures.ts";
import { loadRegistry } from "./registry.ts";
import { readScreenBrief, type ScreenBrief } from "./screen-brief.ts";

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

// Spec § The P1 set, its pass-criteria table, in its order.
const p1Briefs = [
  {
    slug: "bulk-pay",
    audience: "admin",
    requires: {
      components: [
        "Screen",
        "PageHeader",
        "DataTable",
        "StatusTag",
        "Amount",
        "ActionBar",
        "Button",
        "Toast",
        "EmptyState",
      ],
      states: ["empty", "rows-selected", "payment-scheduled", "payment-failed"],
      actions: ["pay-selected"],
      transitions: ["bar-to-toast"],
    },
  },
  {
    slug: "overdue-invoices",
    audience: "admin",
    requires: {
      components: [
        "Screen",
        "PageHeader",
        "DataTable",
        "StatusTag",
        "Amount",
        "Sheet",
        "Heading",
        "ActionBar",
        "Button",
        "Toast",
        "EmptyState",
      ],
      states: ["empty", "rows-selected", "reminders-sent", "reminders-failed"],
      actions: ["send-reminders"],
      transitions: ["bar-to-toast", "row-to-sheet"],
    },
  },
  {
    slug: "failed-payments",
    audience: "admin",
    requires: {
      components: [
        "Screen",
        "PageHeader",
        "DataTable",
        "StatusTag",
        "Amount",
        "ActionBar",
        "Button",
        "Toast",
        "EmptyState",
      ],
      states: ["empty", "rows-selected", "payments-retried", "retry-failed"],
      actions: ["retry-payments"],
      transitions: ["bar-to-toast"],
    },
  },
  {
    slug: "contractors",
    audience: "admin",
    requires: {
      components: [
        "Screen",
        "PageHeader",
        "DataTable",
        "Amount",
        "Sheet",
        "EmptyState",
      ],
      states: ["empty"],
      actions: [],
      transitions: ["row-to-sheet"],
    },
  },
  {
    slug: "run-history",
    audience: "admin",
    requires: {
      components: [
        "Screen",
        "PageHeader",
        "DataTable",
        "StatusTag",
        "Amount",
        "Sheet",
        "EmptyState",
      ],
      states: ["empty"],
      actions: [],
      transitions: ["row-to-sheet"],
    },
  },
  {
    slug: "my-invoices",
    audience: "contractor",
    requires: {
      components: [
        "Screen",
        "Heading",
        "DataTable",
        "Sheet",
        "Amount",
        "StatusTag",
        "Text",
        "EmptyState",
      ],
      states: ["empty"],
      actions: [],
      transitions: ["row-to-sheet"],
    },
  },
  {
    slug: "payments-received",
    audience: "contractor",
    requires: {
      components: [
        "Screen",
        "Heading",
        "DataTable",
        "Amount",
        "Sheet",
        "EmptyState",
      ],
      states: ["empty"],
      actions: [],
      transitions: ["row-to-sheet"],
    },
  },
  {
    slug: "payment-failed",
    audience: "contractor",
    requires: {
      components: [
        "Screen",
        "Heading",
        "Card",
        "Amount",
        "StatusTag",
        "Button",
        "Toast",
      ],
      states: ["retry-requested", "retry-failed"],
      actions: ["request-retry"],
      transitions: [],
    },
  },
  {
    slug: "withdraw-invoice",
    audience: "contractor",
    requires: {
      components: [
        "Screen",
        "Heading",
        "Card",
        "Amount",
        "StatusTag",
        "Text",
        "Button",
        "Toast",
        "EmptyState",
      ],
      states: ["invoice-withdrawn", "withdraw-failed"],
      actions: ["withdraw-invoice"],
      transitions: [],
    },
  },
  {
    slug: "annual-summary",
    audience: "contractor",
    requires: {
      components: [
        "Screen",
        "Heading",
        "Card",
        "Amount",
        "DataTable",
        "EmptyState",
      ],
      states: ["empty"],
      actions: [],
      transitions: [],
    },
  },
];

describe("a screen brief's requires.transitions", () => {
  const dir = join(repo, ".generated", `vitest-brief-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  function planted(requires: string) {
    const path = join(dir, `${randomUUID()}.md`);
    writeFileSync(
      path,
      `---\naudience: admin\nrequires:\n  components: [Screen]\n${requires}---\n\n# A brief\n`
    );
    return path;
  }

  it("takes ADR 0011's transition ids", () => {
    expect(
      readScreenBrief(planted("  transitions: [bar-to-toast, row-to-sheet]\n"))
        .requires.transitions
    ).toEqual(["bar-to-toast", "row-to-sheet"]);
  });

  it("defaults to none", () => {
    expect(readScreenBrief(planted("")).requires.transitions).toEqual([]);
  });

  it("refuses an id that isn't one of them", () => {
    expect(() =>
      readScreenBrief(planted("  transitions: [stagger]\n"))
    ).toThrow(/transitions/);
  });
});

describe("the P0 five", () => {
  it.each(p0Five)(
    "$slug carries the spec's audience and pass criteria",
    (expected) => {
      expect(brief(`${expected.slug}.md`)).toMatchObject(expected);
    }
  );
});

describe("the P1 briefs", () => {
  it.each(p1Briefs)(
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

  // Spec § Rules every brief follows: every id a `requires.*` key checks,
  // components and transitions included. A component is named as a word
  // ("Card", not only "Cards"), and the table's "Screen state" heading
  // doesn't name Screen; a state, action or transition id is backticked.
  it("names every component, state, action and transition id its pass criteria check, verbatim", () => {
    const { requires, text } = brief(file);
    const prose = body(text).replace(/^\| Screen state \|.*$/m, "");
    expect(
      requires.components.filter(
        (id) => !new RegExp(`(?<![\\w-])${id}(?![\\w-])`).test(prose)
      )
    ).toEqual([]);
    expect(
      [...requires.states, ...requires.actions, ...requires.transitions].filter(
        (id) => !prose.includes(`\`${id}\``)
      )
    ).toEqual([]);
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

// Spec #201 § The brief set: an action's result shows in a Toast and a
// list's empty state in an EmptyState, not in a live Text as the P0 five's do.
describe.each([
  "payments-received",
  "payment-failed",
  "withdraw-invoice",
  "annual-summary",
])("the %s screen brief", (slug) => {
  it("shows each state's result in a Toast or an EmptyState, never a live Text", () => {
    const rows = stateTable(brief(`${slug}.md`).text).slice(1);
    for (const { state, shows } of rows) {
      expect(shows, state).toMatch(state === "empty" ? /EmptyState/ : /Toast/);
      expect(shows, state).not.toMatch(/live Text/);
    }
  });
});

// Spec § The P1 set, my-invoices's row: the contractor's own invoices in a
// table with no selection, a row opening its Sheet.
describe("the my-invoices screen brief", () => {
  it("tables each state's fixture variant", () => {
    expect(
      stateTable(brief("my-invoices.md").text).map(({ state, fixture }) => [
        state,
        fixture,
      ])
    ).toEqual([
      ["default", "default"],
      ["empty", "my-invoices/empty"],
    ]);
  });

  it("starts its empty state with none of your invoices", () => {
    expect(fixtureVariant("my-invoices/empty").data.yourInvoices).toEqual([]);
  });
});

// Each action's outcomes, as its brief's sentence names them: "The `a`
// action runs the `op` operation …; it enters `s` when … and `f` when it
// doesn't".
function actionOutcomes({ text }: ScreenBrief) {
  const sentence =
    /The `([\w-]+)` action runs the `(\w+)` operation[^;]*; it enters `([\w-]+)` when [^`]*? and `([\w-]+)` when (?:it|they) (?:doesn't|don't|isn't|aren't)/g;
  return new Map(
    [...body(text).matchAll(sentence)].map(
      ([, action, operation, success, failure]) => [
        action!,
        { operation: operation!, success: success!, failure: failure! },
      ]
    )
  );
}

// GLOSSARY.md § Coverage rule, over a set of briefs: what the set falls
// short of, one line each, or nothing when it meets the rule.
function coverageShortfalls(
  briefs: readonly ScreenBrief[],
  counted: readonly string[]
) {
  const shortfalls: string[] = [];
  for (const component of counted) {
    const listing = briefs
      .filter((each) => each.requires.components.includes(component))
      .map((each) => each.slug);
    if (listing.length < 2) {
      shortfalls.push(
        `${component} is in ${listing.length} brief's requires.components (${listing.join(", ")}); the rule needs 2`
      );
    }
  }
  for (const audience of densities) {
    const count = briefs.filter((each) => each.audience === audience).length;
    if (count * 3 < briefs.length) {
      shortfalls.push(
        `${audience} has ${count} of ${briefs.length} briefs; the rule needs a third`
      );
    }
  }
  for (const each of briefs) {
    const outcomes = actionOutcomes(each);
    for (const action of each.requires.actions) {
      const failure = outcomes.get(action)?.failure;
      if (!failure || !each.requires.states.includes(failure)) {
        shortfalls.push(
          `${action} in ${each.slug} has no failure state in requires.states`
        );
      }
    }
  }
  return shortfalls;
}

describe("the coverage rule", () => {
  const all = briefFiles.map(brief);
  // Every public component but the layout primitive Stack; the internal
  // entries (Checkbox, IconButton) are left out with the spec step's view.
  const counted = async () =>
    (await loadRegistry()).entries
      .filter((entry) => !entry.internal && entry.name !== "Stack")
      .map((entry) => entry.name);

  it("counts every public component but Stack", async () => {
    expect(await counted()).toEqual([
      "ActionBar",
      "Amount",
      "Button",
      "Card",
      "DataTable",
      "EmptyState",
      "Heading",
      "PageHeader",
      "Screen",
      "Sheet",
      "StatusTag",
      "Text",
      "Toast",
    ]);
  });

  it("holds across the fifteen briefs", async () => {
    expect(all).toHaveLength(15);
    expect(coverageShortfalls(all, await counted())).toEqual([]);
  });

  // Text is listed by my-invoices and withdraw-invoice alone, so losing
  // either leaves it in one brief.
  it.each([
    ["my-invoices", "withdraw-invoice"],
    ["withdraw-invoice", "my-invoices"],
  ])(
    "falls short without %s, Text being left in %s alone",
    async (removed, left) => {
      expect(
        coverageShortfalls(
          all.filter((each) => each.slug !== removed),
          await counted()
        )
      ).toEqual([
        `Text is in 1 brief's requires.components (${left}); the rule needs 2`,
      ]);
    }
  );

  it("falls short when an audience has under a third of the briefs", async () => {
    const admin = all.filter((each) => each.audience === "admin");

    expect(coverageShortfalls(admin, await counted())).toContain(
      `contractor has 0 of ${admin.length} briefs; the rule needs a third`
    );
  });

  it("falls short when an action enters no failure state", async () => {
    const withoutFailure = all.map((each) =>
      each.slug === "withdraw-invoice"
        ? {
            ...each,
            requires: {
              ...each.requires,
              states: each.requires.states.filter(
                (state) => state !== "withdraw-failed"
              ),
            },
          }
        : each
    );

    expect(coverageShortfalls(withoutFailure, await counted())).toEqual([
      "withdraw-invoice in withdraw-invoice has no failure state in requires.states",
    ]);
  });
});

// Every action's failure state is a real one: the fixture variant its row
// names makes the action's operation fail, and its success state's doesn't.
describe.each(
  briefFiles.filter((file) => brief(file).requires.actions.length > 0)
)("the actions of %s", (file) => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const settles = async (variant: string, operation: string) => {
    const run = fixtureVariant(variant).operations[
      operation as keyof Operations
    ] as (subject: readonly string[]) => Promise<void>;
    const outcome = run(["a-row"]).then(
      () => "resolved",
      () => "rejected"
    );
    await vi.advanceTimersByTimeAsync(1800);
    return outcome;
  };

  it.each(brief(file).requires.actions)(
    "%s fails its operation in its failure state's variant, and not in its success state's",
    async (action) => {
      const outcome = actionOutcomes(brief(file)).get(action);
      expect(outcome, `${action}'s sentence`).toBeDefined();
      const variantOf = (state: string) =>
        stateTable(brief(file).text).find((row) => row.state === state)
          ?.fixture ?? "";

      expect(
        await settles(variantOf(outcome!.failure), outcome!.operation)
      ).toBe("rejected");
      expect(
        await settles(variantOf(outcome!.success), outcome!.operation)
      ).toBe("resolved");
    }
  );
});
