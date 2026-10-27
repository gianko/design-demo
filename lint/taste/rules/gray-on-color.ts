// `gray-on-color` (lint/taste/RULES.md). Origin: impeccable's `gray-on-color`
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L384),
// kept; Apache 2.0, read at commit dad8dbb; reimplemented, no code copied.
// Each visible text's colour is held against the background it reads on:
// the first box at or above it that paints one. Muted neutral text on a
// status tint or on the accent fails, however the colour got there
// (inherited, or set on the text itself) and however far up the tint is
// painted. Gate 2 lets only tokens through, so both sides are named by
// token: the theme's own values are read in the page, under the text's
// theme scope, so the rule follows the tokens in light and dark.

import type { BackgroundColor, TextColor } from "../../../tokens/tokens.ts";
import { inPage, type RenderFinding, type RenderRule } from "../render.ts";
import { help } from "../rules-md.ts";

export const id = "gray-on-color";

const roles = {
  // The neutral text roles below ink: "Roles: … `ink`, `ink-muted`", and
  // disabled, the colour a control drains to. Ink, on-accent and each
  // status's own text are a tint's partners, not muted.
  muted: ["ink-muted", "disabled"] satisfies TextColor[],
  // "Status colours are their own set", and the accent with its hover,
  // pressed and progress steps. The selected-row tint is neither: it's the
  // neutral hue lifted for selection, and a row's muted cells stay on it.
  tinted: [
    "awaiting",
    "overdue",
    "paid",
    "scheduled",
    "failed",
    "accent",
    "accent-hover",
    "accent-pressed",
    "progress",
  ] satisfies BackgroundColor[],
};

export const render: RenderRule = {
  name: id,
  help: help(id),
  check: (page, root) => inPage(page, root, grayOnColor, roles),
};

// In the page: every visible text in a muted role whose background is a
// status tint or the accent.
function grayOnColor(
  root: Element,
  { muted, tinted }: typeof roles
): RenderFinding[] {
  const failures: RenderFinding[] = [];
  const scopes = new Map<Element, ReturnType<typeof resolve>>();
  const seen = new Set<Element>();
  for (const { element, text } of taste.texts(root)) {
    if (seen.has(element)) continue;
    seen.add(element);
    const scope = element.closest("[data-theme]") ?? root;
    if (!scopes.has(scope)) scopes.set(scope, resolve(scope));
    const { text: textRoles, background, transparent } = scopes.get(scope)!;
    const role = textRoles.get(getComputedStyle(element).color);
    if (!role) continue;
    let tint: string | undefined;
    for (let box: Element | null = element; box; box = box.parentElement) {
      const color = getComputedStyle(box).backgroundColor;
      if (color === transparent) continue;
      tint = background.get(color);
      break;
    }
    if (!tint) continue;
    failures.push(
      taste.at(
        element,
        `${taste.quote(text)} is ${role} text on the ${tint} background.`
      )
    );
  }
  return failures;

  // Each role's computed colour under a theme scope, read off a probe
  // placed inside it.
  function resolve(scope: Element) {
    const probe = document.createElement("span");
    scope.append(probe);
    const read = (property: "color" | "backgroundColor", value: string) => {
      probe.style[property] = value;
      return getComputedStyle(probe)[property];
    };
    const resolved = {
      text: new Map(
        muted.map((name) => [
          read("color", `var(--ds-color-text-${name})`),
          name,
        ])
      ),
      background: new Map(
        tinted.map((name) => [
          read("backgroundColor", `var(--ds-color-bg-${name})`),
          name,
        ])
      ),
      transparent: read("backgroundColor", "transparent"),
    };
    probe.remove();
    return resolved;
  }
}
