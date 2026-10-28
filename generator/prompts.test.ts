// The steps' prompts (ADR 0004). The spec step's teaches bindings, and its
// user turn lists the paths the brief's fixture variants can bind, after a
// cached prefix that holds only the design brief, the registry and the wire
// schema (spec § Gate 1 and the spec step). The code step's wires that data.

import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { fixtureVariant, variantNames } from "../src/fixtures/fixtures.ts";
import { rowSlots } from "./gate1.ts";
import { codePrompt, specPrompt } from "./prompts.ts";
import { type LibraryRegistry, loadRegistry } from "./registry.ts";
import { readScreenBrief, type ScreenBrief } from "./screen-brief.ts";

const registry = {
  serialized: { spec: "[]", code: '["code"]' },
} as LibraryRegistry;

const brief: ScreenBrief = {
  audience: "contractor",
  requires: {
    components: ["Screen"],
    states: [],
    actions: [],
    transitions: [],
  },
  slug: "brief",
  text: "# A screen brief",
};

const fixtures = {
  default: {
    invoices: [{ number: "INV-0142", amount: 4800 }],
    overdueInvoice: { number: "INV-0142", dueLabel: "Oct 8" },
  },
  "payment-status/empty": { invoices: [], overdueInvoice: null },
};

const fixtureTypes =
  "export type FixtureData = { reviewInvoice: Invoice | null };";

// The real fixtures and screen briefs, as generate() reads them.
const allVariants = Object.fromEntries(
  variantNames.map((name) => [name, fixtureVariant(name).data])
);
const briefs = join(import.meta.dirname, "../evals/briefs");
const readBrief = (slug: string) => readScreenBrief(join(briefs, `${slug}.md`));
const listedVariants = (turn: string) =>
  [...turn.matchAll(/^Fixture variant "(.+)":$/gm)].map(([, name]) => name);

// ADR 0004: the code step wires data. Bound props and operation arguments
// read the host's fixture variant through the library's hook.
describe("codePrompt", () => {
  it("embeds the code step's registry in its cached prefix", () => {
    const { system } = codePrompt("# Design brief", registry, fixtureTypes);

    expect(system[2]!.text).toBe('<registry>\n["code"]\n</registry>');
  });

  // The first eval run: every first-attempt failure was gate 3 finding a read
  // through a value FixtureData allows to be null, in screens whose states
  // never show it null. The code step saw neither the type nor the variants.
  it("carries the fixture data's types in its cached prefix, and in the prompt hash", () => {
    const prompt = codePrompt("# Design brief", registry, fixtureTypes);
    const changed = codePrompt(
      "# Design brief",
      registry,
      "export type FixtureData = { reviewInvoice: Invoice };"
    );

    expect(prompt.system.at(-1)!.text).toBe(
      `<fixture_types>\n${fixtureTypes}\n</fixture_types>`
    );
    expect(changed.hash).not.toBe(prompt.hash);
  });

  it("guards a read through a value its type allows to be null, whatever the states", () => {
    const [instructions] = codePrompt(
      "# Design brief",
      registry,
      fixtureTypes
    ).system;

    expect(instructions!.text).toContain(
      "Where the path runs through a value its type in <fixture_types> allows to be null, render the node only once it's there, even when every state in the screen brief has it"
    );
  });

  it("wires bound props and operation arguments through useFixtureData", () => {
    const [instructions] = codePrompt(
      "# Design brief",
      registry,
      fixtureTypes
    ).system;

    expect(instructions!.text).toContain("const data = useFixtureData()");
    expect(instructions!.text).toContain(
      "sendReminder.run(data.overdueInvoice.id)"
    );
  });

  // ADR 0011: the host holds the selection, not the fixture data (#188).
  // Every bulk operation acts on the Selection (#218).
  it.each(["payInvoices", "sendReminders", "retryPayments"])(
    "passes %s the selection from useSelectedRows",
    (operation) => {
      const [instructions] = codePrompt(
        "# Design brief",
        registry,
        fixtureTypes
      ).system;

      expect(instructions!.text).toMatch(
        new RegExp(
          `\\b${operation}\\b[^.:]*take the selected rows' ids: call const selected = useSelectedRows\\(\\) at the top of the screen and pass selected to the action's run`
        )
      );
    }
  );
});

// ADR 0004: a DataTable's row slots render once per row, so in code they're
// a function of the row, and their row.* paths read its argument (#186).
describe("the code step's row slots", () => {
  const [instructions] = codePrompt(
    "# Design brief",
    registry,
    fixtureTypes
  ).system;
  const text = instructions!.text;

  it("passes a row slot as a function of the row, returning its nodes", () => {
    expect(text).toContain(
      "A node in a DataTable's cell or detail slot is passed as a function of the row"
    );
    expect(text).toContain(
      "cell={(row) => <><Text text={row.number} /><Amount … /></>}"
    );
  });

  it("reads a row.* path from the row, and every other path from the fixture data", () => {
    expect(text).toContain(
      `a {"bind":"row.<path>"} prop reads row.<path> from that function's argument, not from the fixture data`
    );
  });

  it("names exactly gate 1's row slots", () => {
    const named = /A node in a DataTable's (.+?) slot is passed/.exec(text);

    expect(named?.[1]!.split(" or ")).toEqual([...rowSlots]);
  });

  it("keeps the row slots out of the rule for other non-body slots", () => {
    expect(text).toContain(
      "a node in any other slot, except a DataTable's row slots, is passed as the parent's prop named after that slot"
    );
  });
});

describe("specPrompt", () => {
  it("teaches a bound prop value", () => {
    const { system } = specPrompt("# Design brief", registry, "{}", fixtures);

    expect(system[0]!.text).toContain('{"bind":"<path>"}');
  });

  it("lists the bindable paths and values of the brief's own fixture variants in the user turn", () => {
    const { user } = specPrompt("# Design brief", registry, "{}", fixtures);

    const turn = user({ ...brief, slug: "payment-status" });
    expect(turn).toContain(`Fixture variant "default":
- invoices.0.number: "INV-0142"
- invoices.0.amount: 4800
- overdueInvoice.number: "INV-0142"
- overdueInvoice.dueLabel: "Oct 8"`);
    expect(turn).toContain(`Fixture variant "payment-status/empty":
- invoices: []
- overdueInvoice: null`);
    expect(turn).toContain("# A screen brief");
  });

  // #275: every variant's paths came to 538k chars, 297k uncached input
  // tokens on bulk-pay's spec call. A brief uses `default` and its own
  // `<slug>/<state>` variants (glossary: Fixture variant).
  it("lists only default and the variants named for the brief's slug", () => {
    const prompt = specPrompt("# Design brief", registry, "{}", allVariants);

    const turn = prompt.user(readBrief("bulk-pay"));

    expect(listedVariants(turn)).toEqual([
      "default",
      "bulk-pay/empty",
      "bulk-pay/rows-selected",
      "bulk-pay/payment-scheduled",
      "bulk-pay/payment-failed",
    ]);
  });

  it("leaves out a variant whose name only starts with the brief's slug", () => {
    const { user } = specPrompt("# Design brief", registry, "{}", {
      ...fixtures,
      "payment-status-extra/empty": {},
    });

    expect(listedVariants(user({ ...brief, slug: "payment-status" }))).toEqual([
      "default",
      "payment-status/empty",
    ]);
  });

  it("keeps the fixtures out of the cached prefix, and in the prompt hash", () => {
    const prompt = specPrompt("# Design brief", registry, "{}", fixtures);
    const changed = specPrompt("# Design brief", registry, "{}", {
      default: fixtures.default,
    });

    expect(prompt.system.map((block) => block.text)).toEqual([
      expect.any(String),
      "<design_brief>\n# Design brief\n</design_brief>",
      "<registry>\n[]\n</registry>",
      "<wire_schema>\n{}\n</wire_schema>",
    ]);
    expect(changed.hash).not.toBe(prompt.hash);
  });

  // One spec prompt hash per run, as the eval report shows it (#275), though
  // each brief's turn lists only its own variants.
  it("hashes every variant's paths, whichever brief it is asked for", () => {
    const prompt = specPrompt("# Design brief", registry, "{}", fixtures);
    const changed = specPrompt("# Design brief", registry, "{}", {
      ...fixtures,
      "payment-status/empty": { invoices: [], overdueInvoice: {} },
    });

    expect(prompt.user(brief)).toBe(changed.user(brief));
    expect(changed.hash).not.toBe(prompt.hash);
  });
});

// #275's size guard: bulk-pay's turn was 538k chars with every variant
// listed. Scoped, the largest brief's is about 95k.
describe("the spec step's user turn", () => {
  const { user } = specPrompt("# Design brief", registry, "{}", allVariants);
  const slugs = readdirSync(briefs)
    .filter((file) => file.endsWith(".md"))
    .map((file) => basename(file, ".md"));

  it.each(slugs)("stays within 150,000 chars for %s", (slug) => {
    expect(user(readBrief(slug)).length).toBeLessThanOrEqual(150_000);
  });
});

// ADR 0011: the code step sets Button's pending from useAction, so only the
// code step's registry has it.
describe("Button's pending", () => {
  type Entry = {
    name: string;
    props: { properties: object };
    codeOnly?: string[];
  };
  // Button's entry in a prompt's <registry> block.
  const button = (block: { text: string }) => {
    const json = block.text.replace(/^<registry>\n|\n<\/registry>$/g, "");
    return (JSON.parse(json) as Entry[]).find(({ name }) => name === "Button")!;
  };

  it("is left out of the spec step's registry", async () => {
    const library = await loadRegistry();
    const { system } = specPrompt("# Design brief", library, "{}", fixtures);

    expect(button(system[2]!).props.properties).not.toHaveProperty("pending");
    expect(button(system[2]!)).not.toHaveProperty("codeOnly");
  });

  it("is in the code step's registry, marked as set by the code step", async () => {
    const library = await loadRegistry();
    const { system } = codePrompt("# Design brief", library, fixtureTypes);

    expect(button(system[2]!).props.properties).toHaveProperty("pending");
    expect(button(system[2]!).codeOnly).toEqual(["pending"]);
  });
});
