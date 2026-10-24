// The repair turn (ADR 0010): a failing attempt's hard-gate failures,
// normalised, grouped by gate, with one help line per rule id, asking for the
// whole output again.

import { describe, expect, it } from "vitest";
import type { Failure } from "./failure.ts";
import { repairTurn } from "./repair.ts";

const lint = (line: number, rule = "no-restricted-syntax"): Failure => ({
  gate: "gate 2",
  rule,
  location: `L${line}:7`,
  message: "Intrinsic elements aren't allowed.",
  help: "Disallow specified syntax",
});

const button = (render: string): Failure => ({
  gate: "gate 4",
  rule: "button-name",
  location: 'button[type="button"] <button type="button"></button>',
  message: "Buttons must have discernible text",
  help: "Buttons must have discernible text",
  renders: [render],
});

describe("repairTurn", () => {
  it("collapses one render failure across theme × screen state into one line that lists each", () => {
    const { lines } = repairTurn("code", [
      button("light · default"),
      lint(6),
      button("dark · default"),
      button("light · empty"),
      button("dark · empty"),
    ]);

    expect(lines).toEqual([
      "gate 2 · no-restricted-syntax · L6:7 · Intrinsic elements aren't allowed.",
      'gate 4 · button-name · button[type="button"] <button type="button"></button> · Buttons must have discernible text (in light · default, dark · default, light · empty, dark · empty)',
    ]);
  });

  it("deduplicates lines by rule and location, wherever the duplicates sit", () => {
    const { lines } = repairTurn("code", [
      lint(6),
      lint(7),
      lint(8, "react/jsx-key"),
      { ...lint(6), message: "className isn't allowed." },
    ]);

    expect(lines).toEqual([
      "gate 2 · no-restricted-syntax · L6:7 · Intrinsic elements aren't allowed.",
      "gate 2 · no-restricted-syntax · L7:7 · Intrinsic elements aren't allowed.",
      "gate 2 · react/jsx-key · L8:7 · Intrinsic elements aren't allowed.",
    ]);
  });

  // A script error has no element to point at, only the page, so its
  // message is what tells two of them apart.
  it("keeps failures with no place to point at apart by message, collapsing each across renders", () => {
    const scriptError = (message: string, render: string): Failure => ({
      gate: "gate 7 render",
      rule: "script-error",
      location: "(page)",
      message,
      renders: [render],
    });

    const { lines } = repairTurn("code", [
      scriptError("pageerror: The screen broke.", "light · default"),
      scriptError("console error: A key is missing.", "light · default"),
      scriptError("pageerror: The screen broke.", "dark · default"),
    ]);

    expect(lines).toEqual([
      "gate 7 render · script-error · (page) · pageerror: The screen broke. (in light · default, dark · default)",
      "gate 7 render · script-error · (page) · console error: A key is missing. (in light · default)",
    ]);
  });

  it("caps each gate at 20 lines with a +N more count, counted after deduplication", () => {
    // 23 failures, two of them repeats: 21 distinct lines.
    const failures = [
      ...Array.from({ length: 21 }, (_, i) => lint(i + 1)),
      lint(3),
      lint(19),
    ];

    const { lines } = repairTurn("code", [
      ...failures,
      button("light · default"),
    ]);

    expect(
      lines.filter((line) => line.startsWith("gate 2 · no-restricted-syntax"))
    ).toHaveLength(20);
    expect(lines).toContain("gate 2 · +1 more");
    expect(lines.at(-1)).toMatch(/^gate 4 · button-name · /);
  });

  it("groups lines by gate, gives each rule id one help line and asks for the whole output again", () => {
    const { text } = repairTurn("code", [
      lint(6),
      {
        gate: "gate 3",
        rule: "TS2322",
        location: "L7:15",
        message: "Type 'number' is not assignable to type 'string'.",
      },
      lint(9),
      button("light · default"),
      button("dark · default"),
    ]);

    expect(text).toBe(
      `The TSX file you sent fails these gates. Each line is gate · rule id · location · message.

gate 2
gate 2 · no-restricted-syntax · L6:7 · Intrinsic elements aren't allowed.
gate 2 · no-restricted-syntax · L9:7 · Intrinsic elements aren't allowed.

gate 3
gate 3 · TS2322 · L7:15 · Type 'number' is not assignable to type 'string'.

gate 4
gate 4 · button-name · button[type="button"] <button type="button"></button> · Buttons must have discernible text (in light · default, dark · default)

What each rule checks:
no-restricted-syntax: Disallow specified syntax
button-name: Buttons must have discernible text

Fix every failure above and send the whole TSX file again, in one \`\`\`tsx block.`
    );
  });

  it("asks the spec step for the whole UI spec, with no help section when no rule has one", () => {
    const { text } = repairTurn("spec", [
      {
        gate: "gate 1",
        rule: "registered-component",
        location: "welcome",
        message: '"Paragraph" isn\'t a registered component.',
      },
    ]);

    expect(text).toBe(
      `The UI spec you sent fails these gates. Each line is gate · rule id · location · message.

gate 1
gate 1 · registered-component · welcome · "Paragraph" isn't a registered component.

Fix every failure above and send the whole UI spec again.`
    );
  });
});
