// `motion-tokens` (lint/taste/RULES.md). Origin: new, adapting impeccable's
// `bounce-easing` detector
// (https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/crates/foundation/src/registry.rs#L124,
// Apache 2.0, read at commit dad8dbb; reimplemented, no code copied).
// Impeccable flags easing curves that leave 0–1. Here `settle` is such a curve
// by design, so the check moves to where motion is written: every transition
// takes a duration and an easing token, `transition-all` is out, `settle`
// never runs on an exit, and no keyframe swings back more than once.

import type { Rule } from "eslint";
import { classTokens, type ClassToken } from "../classes.ts";
import { help } from "../rules-md.ts";
import { reporter, sourceVisitors, type Keyframe } from "../source.ts";
import { splitOutsideBrackets } from "../split.ts";

export const id = "motion-tokens";

const transition = /^transition(?:-(?!none$|discrete$|normal$)[a-z]+)?$/;
const durationToken = /^duration-(?:fast|base|slow)(?:-exit)?$|^duration-loop$/;
const easeToken = /^ease-(?:standard|exit|settle|linear)$/;
const exitDuration = /^duration-[a-z]+-exit$/;
// Variants that apply while something leaves.
const exitState =
  /state=closed|^data-closed$|^(?:group|peer)-data-\[state=closed\]/;

export const lint: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: help(id), url: "lint/taste/RULES.md" },
    schema: [],
    messages: { motion: `{{finding}} ${help(id)}` },
  },
  create(context) {
    const report = reporter(context, "motion");

    return sourceVisitors(context, {
      classList(text, node, selector) {
        for (const finding of classListFindings(classTokens(text), selector)) {
          report(node, finding);
        }
      },
      declaration(property, value, node, selector) {
        const finding = declarationFinding(property, value, selector);
        if (finding) report(node, finding);
      },
      keyframes(name, frames, node) {
        const finding = swingFinding(frames);
        if (finding) report(node, `@keyframes ${name}: ${finding}`);
      },
    });
  },
};

// CSS: a duration or easing is a token when it reads one through var().
const durationVar = /var\(--ds-motion-(?:duration|delay)-[a-z-]+\)/;
const easeVar = /var\(--(?:ds-motion-)?ease-[a-z-]+\)/;
const animationVar = /^var\(--(?:ds-motion-)?animate-[a-z-]+\)$/;
const settleVar = /var\(--(?:ds-motion-)?ease-settle\)/;
const exitDurationVar = /var\(--ds-motion-duration-[a-z]+-exit\)/;
// Selectors that match while something leaves.
const exitSelector = /\[data-state=["']?closed["']?\]|\[data-closed\]/;

function declarationFinding(
  property: string,
  value: string,
  selector: string
): string | null {
  const motion = /^(?:transition|animation)(?:-|$)/.test(property);
  if (!motion) return null;
  const declared = value.trim();

  if (
    settleVar.test(declared) &&
    (exitSelector.test(selector) || exitDurationVar.test(declared))
  ) {
    return `\`${property}: ${declared}\` runs \`settle\` on an exit.`;
  }
  switch (property) {
    case "transition":
    case "animation": {
      if (
        declared === "none" ||
        (property === "animation" && animationVar.test(declared))
      ) {
        return null;
      }
      for (const part of topLevel(declared)) {
        if (property === "transition" && /^all\b/.test(part.trim())) {
          return `\`${property}: ${declared}\` animates every property.`;
        }
        if (!durationVar.test(part) || !easeVar.test(part)) {
          return `\`${property}: ${part.trim()}\` lacks a duration or easing token.`;
        }
      }
      return null;
    }
    case "transition-property":
      return /\ball\b/.test(declared)
        ? `\`${property}: ${declared}\` animates every property.`
        : null;
    case "transition-duration":
    case "animation-duration":
      return topLevel(declared).every((part) => durationVar.test(part))
        ? null
        : `\`${property}: ${declared}\` is not a duration token.`;
    case "transition-timing-function":
    case "animation-timing-function":
      return topLevel(declared).every((part) => easeVar.test(part))
        ? null
        : `\`${property}: ${declared}\` is not an easing token.`;
    default:
      return null;
  }
}

// A value's comma-separated layers.
function topLevel(value: string): string[] {
  return splitOutsideBrackets(value, ",");
}

// A keyframe property swings back when its value turns around. Settle's one
// overshoot turns once; a bounce turns again. A jump between two frames a
// hair apart (the sweep's wrap) is a cut, not a swing, so it starts a new
// run instead of counting as a turn.
function swingFinding(frames: Keyframe[]): string | null {
  const sorted = [...frames].sort((a, b) => a.offset - b.offset);
  const properties = new Set(sorted.flatMap((f) => [...f.declarations.keys()]));
  for (const property of properties) {
    const steps = sorted
      .filter((f) => f.declarations.has(property))
      .map((f) => ({
        offset: f.offset,
        numbers: (
          f.declarations.get(property)!.match(/-?\d*\.?\d+/g) ?? []
        ).map(Number),
      }));
    const arity = steps[0]?.numbers.length ?? 0;
    if (steps.some((step) => step.numbers.length !== arity)) continue;
    for (let n = 0; n < arity; n++) {
      let turns = 0;
      let direction = 0;
      for (let i = 1; i < steps.length; i++) {
        if (steps[i]!.offset - steps[i - 1]!.offset <= 0.1) {
          direction = 0;
          continue;
        }
        const delta = Math.sign(
          steps[i]!.numbers[n]! - steps[i - 1]!.numbers[n]!
        );
        if (delta === 0) continue;
        if (direction !== 0 && delta !== direction) turns++;
        direction = delta;
      }
      if (turns > 1) return `\`${property}\` swings back ${turns} times.`;
    }
  }
  return null;
}

function classListFindings(tokens: ClassToken[], selector: string): string[] {
  const findings: string[] = [];
  const has = (pattern: RegExp) => tokens.some((t) => pattern.test(t.utility));
  const transitions = tokens.filter((t) => transition.test(t.utility));

  for (const token of transitions) {
    if (token.utility === "transition-all") {
      findings.push(`\`${token.raw}\` animates every property.`);
    }
  }
  if (transitions.length > 0 && !(has(durationToken) && has(easeToken))) {
    const missing = [
      has(durationToken) ? null : "a `duration-*` token",
      has(easeToken) ? null : "an `ease-*` token",
    ].filter(Boolean);
    findings.push(`\`${transitions[0]!.raw}\` lacks ${missing.join(" and ")}.`);
  }

  // Settle on an exit: under an exit-state variant, or alongside an exit
  // duration that applies under the same variants.
  for (const token of tokens.filter((t) => t.utility === "ease-settle")) {
    const variants = token.variants.join(":");
    const onExit =
      exitSelector.test(selector) ||
      token.variants.some((variant) => exitState.test(variant)) ||
      tokens.some(
        (other) =>
          exitDuration.test(other.utility) &&
          other.variants.join(":") === variants
      );
    if (onExit) findings.push(`\`${token.raw}\` runs on an exit.`);
  }
  return findings;
}
