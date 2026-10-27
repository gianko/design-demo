// How far a control's hover moves what it paints, for style expectations
// about hover (ADR 0012). A play function can't put an element in `:hover`,
// and it only reads, so this reads the stylesheet rules that would apply
// under the pointer instead: the fill they give the element itself, and the
// fill they give its `::before` (a layer over the element's own fill, which
// the library draws `absolute inset-0`). It paints those fills over whatever
// is behind the element, as the browser composites them (./canvas-colour.ts).

import { converter } from "culori";
import { minLightnessStep } from "../tokens/lightness-step.ts";
import { paint } from "./canvas-colour.ts";

// `:hover`, but not the escaped `hover\:` of a class name.
const hoverPseudo = /(?<!\\):hover\b/;

type Fills = { own?: string; before?: string };

/** The fills the rules that style `element` only under the pointer set. */
function hoverFills(element: Element): Fills {
  const fills: Fills = {};
  const visit = (rules: CSSRuleList, parent?: string) => {
    for (const rule of rules) {
      if (
        rule instanceof CSSMediaRule &&
        !matchMedia(rule.media.mediaText).matches
      )
        continue;
      let selector = parent;
      if (rule instanceof CSSStyleRule) {
        const own = rule.selectorText;
        selector = !parent
          ? own
          : own.includes("&")
            ? own.replaceAll("&", `:is(${parent})`)
            : `:is(${parent}) ${own}`;
      }
      if ("style" in rule && selector && hoverPseudo.test(selector)) {
        const at = selector.replace(new RegExp(hoverPseudo, "g"), "");
        const fill = (rule.style as CSSStyleDeclaration).getPropertyValue(
          "background-color"
        );
        const layer = at.endsWith("::before") ? "before" : "own";
        if (fill && matches(element, at.replace(/::before$/, ""))) {
          fills[layer] = fill;
        }
      }
      if ("cssRules" in rule) visit(rule.cssRules as CSSRuleList, selector);
    }
  };
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // A cross-origin sheet: none of the library's rules.
    }
    visit(rules);
  }
  return fills;
}

function matches(element: Element, selector: string) {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}

/** A colour with every `var()` in it read off `element`. */
function resolved(value: string, element: Element): string {
  const style = getComputedStyle(element);
  let colour = value;
  for (let depth = 0; colour.includes("var(") && depth < 8; depth++) {
    colour = colour.replace(
      /var\((--[\w-]+)(?:,\s*([^()]*))?\)/g,
      (_, name: string, fallback?: string) =>
        style.getPropertyValue(name).trim() || fallback || "transparent"
    );
  }
  return colour;
}

const oklch = converter("oklch");
const lightness = ([r, g, b]: Uint8ClampedArray) =>
  oklch({ mode: "rgb", r: r! / 255, g: g! / 255, b: b! / 255 }).l;

/** The fills behind `element`, from the nearest opaque one in. */
function fillsBehind(element: Element): string[] {
  const behind: string[] = [];
  for (let box = element.parentElement; box; box = box.parentElement) {
    const fill = getComputedStyle(box).backgroundColor;
    const [, , , alpha] = paint([fill]);
    if (alpha === 0) continue;
    behind.unshift(fill);
    if (alpha === 255) break;
  }
  return behind;
}

/** What `element` paints, at rest or hovered, over what's behind it. */
function painted(element: Element, hovered: boolean): number {
  const hover = hovered ? hoverFills(element) : {};
  const before = getComputedStyle(element, "::before");
  const layers = [
    hover.own ?? getComputedStyle(element).backgroundColor,
    hover.before ??
      (before.content === "none" ? "transparent" : before.backgroundColor),
  ];
  return lightness(
    paint([
      ...fillsBehind(element),
      ...layers.map((layer) => resolved(layer, element)),
    ])
  );
}

/**
 * The OKLCH lightness step between what `element` paints at rest and under
 * the pointer, on the surface behind it. A hover that doesn't show is 0.
 */
export function hoverStep(element: Element): number {
  return Math.abs(painted(element, true) - painted(element, false));
}

/**
 * Each element whose hover steps less than the token build's minimum, named
 * by its component's text and the fill behind it, with its step: empty when
 * every hover shows.
 */
export function faintHovers(elements: Element[]): string[] {
  return elements.flatMap((element) => {
    const step = hoverStep(element);
    if (step >= minLightnessStep) return [];
    const name = (element.closest("[data-component]") ?? element).textContent;
    const behind = fillsBehind(element).at(-1);
    return [`${name} on ${behind} steps ${step.toFixed(4)}`];
  });
}
