// The spec step's prompt (ADR 0004, spec § Gate 1 and the spec step): it
// teaches bindings, and the user turn lists the paths each fixture variant
// can bind, after a cached prefix that holds only the design brief, the
// registry and the wire schema.

import { describe, expect, it } from "vitest";
import { specPrompt } from "./prompts.ts";
import type { LibraryRegistry } from "./registry.ts";
import type { ScreenBrief } from "./screen-brief.ts";

const registry = { serialized: "[]" } as LibraryRegistry;

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
