// The screen-state transitions' motion (ADR 0011): `ease-settle` runs only
// under a `confirm` transition and never on the leaving view, and under
// reduced motion every transition is a `fast` crossfade. jsdom parses
// styles.css but runs no View Transitions, so this resolves the cascade of
// its view-transition rules itself: a rule applies to a pseudo-element when
// its selector names it, or every name with `*`, under the transition type
// it names if any, and in the media it sits in; a typed selector outranks an
// untyped one, a named one an unnamed one, and a later rule an earlier one.
// A rule on `:only-child` applies to an image that is alone in its pair: an
// element in the new view only (entering) or the old view only (leaving);
// one on `:not(:only-child)` to an image with a partner.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

type Pseudo = "group" | "new" | "old";
type Type = "confirm" | "fail" | "sheet-open" | "sheet-close" | undefined;
type Media = { reducedMotion: boolean };

const selector =
  /^(?::root:active-view-transition-type\(([\w-]+)\))?::view-transition-(group|new|old)\((\*|[\w-]+)\)(:only-child|:not\(:only-child\))?$/;

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
// group `name`, its image `alone` in its pair or not.
function computed(
  pseudo: Pseudo,
  type: Type,
  { reducedMotion }: Media,
  name = unnamed,
  alone = false
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
      const [, typed, target, group, onlyChild] = match;
      if (target !== pseudo || (typed && typed !== type)) continue;
      if (group !== "*" && group !== name) continue;
      if (onlyChild && (onlyChild === ":only-child") !== alone) continue;
      // Specificity, then order: the type and `:only-child` each a
      // pseudo-class, a name a type selector, `*` nothing.
      const rank =
        (typed ? 2_000_000 : 0) +
        (onlyChild ? 1_000_000 : 0) +
        (group === "*" ? 0 : 100_000) +
        order;
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
    slidePast: value("--slide-past")?.trim(),
    opacity: value("opacity"),
  };
}

const token = (name: string) => `var(--ds-motion-${name})`;
const tokens = join(import.meta.dirname, "../tokens");
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

// Toast's slide (ADR 0013): a toast, the only element named `toast`, slides
// in from the end edge when it enters, its image alone in the new view: at
// `slow`, settling under `confirm`, the transition a success enters in, and
// with `standard` under `fail`. It slides back out past the end edge at
// `slow-exit` with `exit` whenever it leaves, its image alone in the old
// view: closed, timed out or gone with its state. No fade and no scale. A
// toast that replaces another, or shows again where it was, slides nowhere.
describe("toast transitions", () => {
  it("slide a success toast in from the end edge at slow, settling, under confirm", () => {
    expect(computed("new", "confirm", motion, "toast", true)).toMatchObject({
      name: "slide-in",
      duration: token("duration-slow"),
      easing: token("ease-settle"),
    });
  });

  it("slide a failure toast in from the end edge at slow, never settling, under fail", () => {
    expect(computed("new", "fail", motion, "toast", true)).toMatchObject({
      name: "slide-in",
      duration: token("duration-slow"),
      easing: token("ease-standard"),
    });
  });

  it.each(types)(
    "slide a leaving toast out past the end edge, under %s",
    (type) => {
      expect(computed("old", type, motion, "toast", true)).toMatchObject({
        name: "slide-out",
        duration: token("duration-slow-exit"),
        easing: token("ease-exit"),
      });
    }
  );

  // No fade and no scale (#299): the old toast's image is hidden, the new
  // one shows at once, and the group neither moves nor resizes.
  it.each(types)(
    "swap at once, with no fade or scale, when a toast replaces another, under %s",
    (type) => {
      for (const pseudo of ["group", "new", "old"] as const) {
        expect(computed(pseudo, type, motion, "toast").name).toBe("none");
      }
      expect(computed("old", type, motion, "toast").opacity).toBe("0");
      expect(computed("new", type, motion, "toast").opacity).toBeUndefined();
    }
  );

  it.each(types)("show a leaving toast as it slides out, under %s", (type) => {
    expect(
      computed("old", type, motion, "toast", true).opacity
    ).toBeUndefined();
  });

  // The toast sits the page padding in from the window's edge, so its own
  // width doesn't take it out of the window: it slides a step further, one
  // wider than either density's page padding (the slide's pseudo-elements
  // hang off the root, outside the screen's density scope).
  it("slide a toast past the page padding of either density", () => {
    const { slidePast } = computed("new", "confirm", motion, "toast", true);
    expect(slidePast).toBe("var(--ds-space-2xl)");
    expect(computed("old", undefined, motion, "toast", true).slidePast).toBe(
      slidePast
    );
    const px = (file: string, path: string[]) =>
      path.reduce<Record<string, unknown>>(
        (at, key) => at[key] as Record<string, unknown>,
        JSON.parse(readFileSync(join(tokens, file), "utf8"))
      ).$value as { value: number };
    const past = px("space.json", ["space", "2xl"]).value;
    for (const density of ["admin", "contractor"]) {
      const page = px(`density.${density}.json`, [
        "density",
        "padding",
        "page",
      ]);
      expect(past, density).toBeGreaterThan(page.value);
    }
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
      name: "slide-in",
      duration: token("duration-slow"),
      easing: token("ease-standard"),
    });
  });

  it("slide the sheet out past the end edge at slow-exit with exit easing", () => {
    expect(computed("old", "sheet-close", motion, "row-detail")).toEqual({
      name: "slide-out",
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

// Under reduced motion, nothing moves: a sheet or a toast entering or
// leaving alone crossfades at `fast` like everything else.
describe("named transitions under reduced motion", () => {
  it.each([
    ["toast", "confirm"],
    ["toast", "fail"],
    ["toast", undefined],
    ["row-detail", "sheet-open"],
    ["row-detail", "sheet-close"],
  ] as const)("crossfade %s at fast, under %s", (name, type) => {
    expect(computed("group", type, reduced, name).name).toBe("none");
    for (const alone of [false, true]) {
      for (const pseudo of ["new", "old"] as const) {
        expect(computed(pseudo, type, reduced, name, alone)).toEqual({
          name: undefined,
          duration: token("duration-fast"),
          easing: token("ease-standard"),
        });
      }
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

  it("has no Toast or Sheet stylesheet, and nothing imports one", () => {
    for (const name of ["Toast", "Sheet"]) {
      expect(existsSync(join(src, "components", name, `${name}.css`))).toBe(
        false
      );
    }
    const importing = files(src)
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) =>
        /import\s+["'][^"']*\/(Toast|Sheet)\.css["']/.test(
          readFileSync(file, "utf8")
        )
      )
      .map((file) => relative(src, file));
    expect(importing).toEqual([]);
  });

  it.each([
    ["vt-toast", "toast"],
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
