import { describe, expect, it } from "vitest";
import { baselineMode } from "./baseline-mode.ts";

describe("baselineMode", () => {
  it("writes a missing baseline outside CI, for the human to approve", () => {
    expect(baselineMode({ update: false, ci: false })).toBe("missing");
  });

  it("fails a missing baseline in CI instead of writing it", () => {
    expect(baselineMode({ update: false, ci: true })).toBe("none");
  });

  it("rewrites a changed baseline only when --update asks", () => {
    expect(baselineMode({ update: true, ci: false })).toBe("changed");
  });

  it("refuses --update in CI, since no workflow rewrites baselines", () => {
    expect(() => baselineMode({ update: true, ci: true })).toThrow("--update");
  });
});
