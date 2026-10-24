// The screen-state transitions' motion (ADR 0011): `ease-settle` runs only
// under a `confirm` transition and never on the leaving view, and under
// reduced motion every transition is a `fast` crossfade. jsdom parses
// styles.css but runs no View Transitions, so this resolves the cascade of
// its view-transition rules itself: a rule applies to a pseudo-element when
// its selector names it, under the transition type it names if any, and in
// the media it sits in; a typed selector outranks an untyped one, and a
// later rule an earlier one.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Pseudo = "group" | "new" | "old";
type Type = "confirm" | "fail" | undefined;
type Media = { reducedMotion: boolean };

const selector =
  /^(?::root:active-view-transition-type\((\w+)\))?::view-transition-(group|new|old)\(\*\)$/;

function sheet() {
  const style = document.createElement("style");
  style.textContent = readFileSync(
    join(import.meta.dirname, "styles.css"),
    "utf8"
  );
  document.head.append(style);
  const rules = style.sheet!.cssRules;
  style.remove();
  return rules;
}

// The declarations that win on one view-transition pseudo-element.
function computed(pseudo: Pseudo, type: Type, { reducedMotion }: Media) {
  const winners = new Map<string, { rank: number; value: string }>();
  const apply = (rule: CSSStyleRule, order: number) => {
    for (const one of rule.selectorText.split(",").map((s) => s.trim())) {
      if (!one.includes("::view-transition")) continue;
      const match = selector.exec(one);
      if (!match) throw new Error(`An unexpected selector: ${one}`);
      const [, typed, target] = match;
      if (target !== pseudo || (typed && typed !== type)) continue;
      const rank = (typed ? 1_000_000 : 0) + order;
      for (const property of Array.from(rule.style)) {
        const known = winners.get(property);
        if (!known || known.rank <= rank) {
          winners.set(property, {
            rank,
            value: rule.style.getPropertyValue(property),
          });
        }
      }
    }
  };
  let order = 0;
  for (const rule of sheet()) {
    if (rule instanceof CSSStyleRule) apply(rule, order++);
    if (
      rule instanceof CSSMediaRule &&
      rule.conditionText === "(prefers-reduced-motion: reduce)" &&
      reducedMotion
    ) {
      for (const inner of rule.cssRules) {
        if (inner instanceof CSSStyleRule) apply(inner, order++);
      }
    }
  }
  const value = (property: string) => winners.get(property)?.value;
  return {
    name: value("animation-name"),
    duration: value("animation-duration"),
    easing: value("animation-timing-function"),
  };
}

const token = (name: string) => `var(--ds-motion-${name})`;
const types: Type[] = [undefined, "confirm", "fail"];

describe("screen-state transitions", () => {
  it.each(["group", "new"] as const)(
    "settle the %s view only under confirm",
    (pseudo) => {
      const motion = { reducedMotion: false };
      expect(computed(pseudo, "confirm", motion)).toEqual({
        name: undefined,
        duration: token("duration-base"),
        easing: token("ease-settle"),
      });
      for (const type of [undefined, "fail"] as const) {
        expect(computed(pseudo, type, motion)).toEqual({
          name: undefined,
          duration: token("duration-base"),
          easing: token("ease-standard"),
        });
      }
    }
  );

  it.each(types)("never settle the leaving view, under %s", (type) => {
    expect(computed("old", type, { reducedMotion: false })).toEqual({
      name: undefined,
      duration: token("duration-base-exit"),
      easing: token("ease-exit"),
    });
  });

  it.each(types)("crossfade at fast under reduced motion, under %s", (type) => {
    const motion = { reducedMotion: true };
    // The group neither moves nor resizes, so only the views fade.
    expect(computed("group", type, motion).name).toBe("none");
    for (const pseudo of ["new", "old"] as const) {
      expect(computed(pseudo, type, motion)).toEqual({
        name: undefined,
        duration: token("duration-fast"),
        easing: token("ease-standard"),
      });
    }
  });
});
