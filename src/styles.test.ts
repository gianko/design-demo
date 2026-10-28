// The screen-state transitions' motion (ADR 0011): `ease-settle` runs only
// under a `confirm` transition and never on the leaving view, and under
// reduced motion every transition is a `fast` crossfade. jsdom parses
// styles.css but runs no View Transitions, so this resolves the cascade of
// its view-transition rules itself: a rule applies to a pseudo-element when
// its selector names it, or every name with `*`, under the transition type
// it names if any, and in the media it sits in; a typed selector outranks an
// untyped one, a named one an unnamed one, and a later rule an earlier one.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

type Pseudo = "group" | "new" | "old";
type Type = "confirm" | "fail" | "sheet-open" | "sheet-close" | undefined;
type Media = { reducedMotion: boolean };

const selector =
  /^(?::root:active-view-transition-type\(([\w-]+)\))?::view-transition-(group|new|old)\((\*|[\w-]+)\)$/;

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

// A name no rule targets: the screen's root, or any element with no name.
const unnamed = "root";

// The declarations that win on one view-transition pseudo-element of the
// group `name`.
function computed(
  pseudo: Pseudo,
  type: Type,
  { reducedMotion }: Media,
  name = unnamed
) {
  const winners = new Map<string, { rank: number; value: string }>();
  const apply = (rule: CSSStyleRule, order: number) => {
    // Prettier wraps a long selector inside its parentheses.
    const selectors = rule.selectorText.replace(/\(\s+|\s+\)/g, (paren) =>
      paren.trim()
    );
    for (const one of selectors.split(",").map((s) => s.trim())) {
      if (!one.includes("::view-transition")) continue;
      const match = selector.exec(one);
      if (!match) throw new Error(`An unexpected selector: ${one}`);
      const [, typed, target, group] = match;
      if (target !== pseudo || (typed && typed !== type)) continue;
      if (group !== "*" && group !== name) continue;
      const rank =
        (typed ? 2_000_000 : 0) + (group === "*" ? 0 : 1_000_000) + order;
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
  const media = reducedMotion
    ? "(prefers-reduced-motion: reduce)"
    : "(prefers-reduced-motion: no-preference)";
  let order = 0;
  for (const rule of sheet()) {
    if (rule instanceof CSSStyleRule) apply(rule, order++);
    if (rule instanceof CSSMediaRule && rule.conditionText === media) {
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
const motion = { reducedMotion: false };
const reduced = { reducedMotion: true };

describe("screen-state transitions", () => {
  it.each(["group", "new"] as const)(
    "settle the %s view only under confirm",
    (pseudo) => {
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
    expect(computed("old", type, motion)).toEqual({
      name: undefined,
      duration: token("duration-base-exit"),
      easing: token("ease-exit"),
    });
  });

  it.each(types)("crossfade at fast under reduced motion, under %s", (type) => {
    // The group neither moves nor resizes, so only the views fade.
    expect(computed("group", type, reduced).name).toBe("none");
    for (const pseudo of ["new", "old"] as const) {
      expect(computed(pseudo, type, reduced)).toEqual({
        name: undefined,
        duration: token("duration-fast"),
        easing: token("ease-standard"),
      });
    }
  });
});

// Toast's timing (ADR 0011): a toast enters at `slow` and leaves at
// `slow-exit`. The bar's group, `action-result`, is timed as a toast only
// under `confirm`, where the bar becomes the toast; the bar entering with
// rows-selected keeps `base`. A failure toast, `action-failure`, is timed so
// under any type.
describe("toast transitions", () => {
  it("time the bar becoming a toast as a toast entering, under confirm", () => {
    for (const pseudo of ["group", "new"] as const) {
      expect(computed(pseudo, "confirm", motion, "action-result")).toEqual({
        name: undefined,
        duration: token("duration-slow"),
        easing: token("ease-settle"),
      });
    }
    expect(computed("old", "confirm", motion, "action-result")).toEqual({
      name: undefined,
      duration: token("duration-slow-exit"),
      easing: token("ease-exit"),
    });
  });

  it("keep base for the bar entering with rows-selected", () => {
    expect(computed("group", undefined, motion, "action-result")).toEqual({
      name: undefined,
      duration: token("duration-base"),
      easing: token("ease-standard"),
    });
    expect(computed("old", undefined, motion, "action-result")).toEqual({
      name: undefined,
      duration: token("duration-base-exit"),
      easing: token("ease-exit"),
    });
  });

  it.each(types)("time a failure toast as a toast, under %s", (type) => {
    for (const pseudo of ["group", "new"] as const) {
      expect(computed(pseudo, type, motion, "action-failure").duration).toBe(
        token("duration-slow")
      );
    }
    expect(computed("old", type, motion, "action-failure").duration).toBe(
      token("duration-slow-exit")
    );
    // A failure never settles.
    expect(computed("new", "fail", motion, "action-failure").easing).toBe(
      token("ease-standard")
    );
  });
});

// Row → sheet (ADR 0011): the row's Sheet, the only element named
// `row-detail`, slides in from the end edge at `slow` with `standard` easing,
// since opening confirms nothing, and back out past it at `slow-exit` with
// `exit`. Its image is on one side of each transition only, the new view's
// on open and the old view's on close, so the group has nothing to morph.
describe("sheet transitions", () => {
  it("slide the sheet in from the end edge at slow, never settling", () => {
    expect(computed("new", "sheet-open", motion, "row-detail")).toEqual({
      name: "sheet-in",
      duration: token("duration-slow"),
      easing: token("ease-standard"),
    });
  });

  it("slide the sheet out past the end edge at slow-exit with exit easing", () => {
    expect(computed("old", "sheet-close", motion, "row-detail")).toEqual({
      name: "sheet-out",
      duration: token("duration-slow-exit"),
      easing: token("ease-exit"),
    });
  });

  // The end edge is the right in a left-to-right document and the left in a
  // right-to-left one; the keyframes slide along it by `--end-edge`.
  it("find the end edge on the right, or on the left in RTL", () => {
    const edge = (selector: string) =>
      [...sheet()]
        .flatMap((rule) =>
          rule instanceof CSSLayerBlockRule ? [...rule.cssRules] : [rule]
        )
        .filter((rule) => rule instanceof CSSStyleRule)
        .find((rule) => rule.selectorText === selector)
        ?.style.getPropertyValue("--end-edge")
        .trim();
    expect(edge(":root")).toBe("1");
    expect(edge(':root[dir="rtl"]')).toBe("-1");
  });
});

describe("named transitions under reduced motion", () => {
  it.each([
    ["action-result", "confirm"],
    ["action-failure", "fail"],
    ["row-detail", "sheet-open"],
    ["row-detail", "sheet-close"],
  ] as const)("crossfade %s at fast, under %s", (name, type) => {
    expect(computed("group", type, reduced, name).name).toBe("none");
    for (const pseudo of ["new", "old"] as const) {
      expect(computed(pseudo, type, reduced, name)).toEqual({
        name: undefined,
        duration: token("duration-fast"),
        easing: token("ease-standard"),
      });
    }
  });
});

// ADR 0006: the shared name is set by a class. The names and their timing
// live in this stylesheet only, so no two component files agree on a name
// by hand.
describe("view transitions in one place", () => {
  const src = import.meta.dirname;
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? files(join(dir, entry.name))
        : [join(dir, entry.name)]
    );

  it("leaves no component stylesheet setting a name or styling a view-transition pseudo-element", () => {
    const touching = files(src)
      .filter((file) => file.endsWith(".css"))
      .filter((file) => file !== join(src, "styles.css"))
      .filter((file) => /view-transition/.test(readFileSync(file, "utf8")))
      .map((file) => relative(src, file));
    expect(touching).toEqual([]);
  });

  it("has no ActionBar, Toast or Sheet stylesheet, and nothing imports one", () => {
    for (const name of ["ActionBar", "Toast", "Sheet"]) {
      expect(existsSync(join(src, "components", name, `${name}.css`))).toBe(
        false
      );
    }
    const importing = files(src)
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) =>
        /import\s+["'][^"']*\/(ActionBar|Toast|Sheet)\.css["']/.test(
          readFileSync(file, "utf8")
        )
      )
      .map((file) => relative(src, file));
    expect(importing).toEqual([]);
  });

  it.each([
    ["vt-action-result", "action-result"],
    ["vt-action-failure", "action-failure"],
    ["vt-row-detail", "row-detail"],
  ])("defines %s as a utility setting %s", (utility, name) => {
    const text = readFileSync(join(src, "styles.css"), "utf8");
    const block = new RegExp(
      String.raw`@utility\s+${utility}\s*\{\s*view-transition-name:\s*${name};\s*\}`
    );
    expect(text).toMatch(block);
  });

  // Screen's focus follows a name by reading it off a `vt-*` class where no
  // styles compute (src/components/Screen/focus.ts), so each class names
  // the transition name it sets.
  it("names every vt-* utility after the view transition name it sets", () => {
    const text = readFileSync(join(src, "styles.css"), "utf8");
    const utilities = [
      ...text.matchAll(/@utility\s+vt-([\w-]+)\s*\{([^}]*)\}/g),
    ].map(([, suffix, body]) => ({
      suffix,
      name: /view-transition-name:\s*([\w-]+)/.exec(body!)?.[1],
    }));
    expect(utilities.length).toBeGreaterThan(0);
    for (const { suffix, name } of utilities) expect(name).toBe(suffix);
  });
});

// The taste rules skip straggler and unbalanced-heading because base CSS
// sets text-wrap once (lint/taste/RULES.md), on the elements Heading and
// Text render, in the base layer so a component could still override it.
describe("base text wrapping", () => {
  function baseRules() {
    const rules: Record<string, string> = {};
    for (const rule of sheet()) {
      if (!(rule instanceof CSSLayerBlockRule) || rule.name !== "base")
        continue;
      for (const inner of rule.cssRules) {
        if (inner instanceof CSSStyleRule) {
          const selectors = inner.selectorText.split(",").map((s) => s.trim());
          rules[selectors.join(", ")] =
            inner.style.getPropertyValue("text-wrap");
        }
      }
    }
    return rules;
  }

  it("balances the headings Heading renders and wraps paragraphs pretty", () => {
    expect(baseRules()).toMatchObject({ "h1, h2, h3": "balance", p: "pretty" });
  });
});
