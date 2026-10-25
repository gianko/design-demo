// The steps' prompts (ADR 0004). The spec step's teaches bindings, and its
// user turn lists the paths each fixture variant can bind, after a cached
// prefix that holds only the design brief, the registry and the wire schema
// (spec § Gate 1 and the spec step). The code step's wires that data.

import { describe, expect, it } from "vitest";
import { codePrompt, specPrompt } from "./prompts.ts";
import { type LibraryRegistry, loadRegistry } from "./registry.ts";
import type { ScreenBrief } from "./screen-brief.ts";

const registry = {
  serialized: { spec: "[]", code: '["code"]' },
} as LibraryRegistry;

const brief: ScreenBrief = {
  audience: "contractor",
  requires: { components: ["Screen"], states: [], actions: [] },
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

// ADR 0004: the code step wires data. Bound props and operation arguments
// read the host's fixture variant through the library's hook.
describe("codePrompt", () => {
  it("embeds the code step's registry in its cached prefix", () => {
    const { system } = codePrompt("# Design brief", registry);

    expect(system.at(-1)!.text).toBe('<registry>\n["code"]\n</registry>');
  });

  it("wires bound props and operation arguments through useFixtureData", () => {
    const [instructions] = codePrompt("# Design brief", registry).system;

    expect(instructions!.text).toContain("const data = useFixtureData()");
    expect(instructions!.text).toContain(
      "sendReminder.run(data.overdueInvoice.id)"
    );
  });
});

describe("specPrompt", () => {
  it("teaches a bound prop value", () => {
    const { system } = specPrompt("# Design brief", registry, "{}", fixtures);

    expect(system[0]!.text).toContain('{"bind":"<path>"}');
  });

  it("lists every fixture variant's bindable paths and values in the user turn", () => {
    const { user } = specPrompt("# Design brief", registry, "{}", fixtures);

    const turn = user(brief);
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
    const { system } = codePrompt("# Design brief", library);

    expect(button(system[2]!).props.properties).toHaveProperty("pending");
    expect(button(system[2]!).codeOnly).toEqual(["pending"]);
  });
});
