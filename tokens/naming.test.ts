import { expect, it } from "vitest";
import { tokenNames } from "./naming.ts";

it("names a colour role the way ADR 0005 spells it out", () => {
  expect(tokenNames("color.text.ink-muted")).toEqual({
    figma: "color/text/ink-muted",
    cssVar: "--ds-color-text-ink-muted",
    codeSyntax: "var(--ds-color-text-ink-muted)",
    themeKey: "--text-color-ink-muted",
    className: "text-ink-muted",
    role: "ink-muted",
    family: "textColor",
  });
});

it.each([
  [
    "color.bg.surface",
    "--background-color-surface",
    "bg-surface",
    "backgroundColor",
  ],
  ["color.border.line", "--border-color-line", "border-line", "borderColor"],
  ["color.ring.focus", "--ring-color-focus", "ring-focus", "ringColor"],
  ["shadow.raised", "--shadow-raised", "shadow-raised", "shadow"],
  ["space.sm", "--spacing-sm", "p-sm", "spacing"],
  ["space.0", "--spacing-0", "p-0", "spacing"],
  ["radius.control", "--radius-control", "rounded-control", "radius"],
  ["density.padding.page", "--padding-page", "p-page", "padding"],
  ["density.height.row", "--height-row", "h-row", "height"],
  [
    "density.min-height.target",
    "--min-height-target",
    "min-h-target",
    "minHeight",
  ],
  ["density.size.icon", "--size-icon", "size-icon", "size"],
  ["density.radius.surface", "--radius-surface", "rounded-surface", "radius"],
  ["size.width.sheet", "--width-sheet", "w-sheet", "width"],
  // Tailwind's max-w-* reads --max-width-*, not --width-*.
  ["size.max-width.card", "--max-width-card", "max-w-card", "maxWidth"],
  ["size.height.edge", "--height-edge", "h-edge", "height"],
  ["type.family.sans", "--font-sans", "font-sans", "font"],
  ["motion.ease.settle", "--ease-settle", "ease-settle", "ease"],
  [
    "motion.animate.progress-sweep",
    "--animate-progress-sweep",
    "animate-progress-sweep",
    "animate",
  ],
  ["z.overlay", "--z-index-overlay", "z-overlay", "zIndex"],
])("maps %s to %s and .%s", (path, themeKey, className, family) => {
  expect(tokenNames(path)).toMatchObject({ themeKey, className, family });
});

it("gives durations and delays named utilities rather than theme keys", () => {
  expect(tokenNames("motion.duration.fast-exit")).toEqual({
    figma: "motion/duration/fast-exit",
    cssVar: "--ds-motion-duration-fast-exit",
    codeSyntax: "var(--ds-motion-duration-fast-exit)",
    className: "duration-fast-exit",
    role: "fast-exit",
    family: "duration",
  });
  expect(tokenNames("motion.delay.stagger")).toMatchObject({
    className: "delay-stagger",
    family: "delay",
  });
});

it("gives text roles named utilities rather than theme keys", () => {
  expect(tokenNames("type.title")).toEqual({
    figma: "type/title",
    cssVar: "--ds-type-title",
    codeSyntax: "var(--ds-type-title)",
    className: "text-title",
    role: "title",
    family: "text",
  });
  expect(tokenNames("density.text.body")).toEqual({
    figma: "density/text/body",
    cssVar: "--ds-density-text-body",
    codeSyntax: "var(--ds-density-text-body)",
    className: "text-body",
    role: "body",
    family: "text",
  });
});

it("gives font weights and primitives no class of their own", () => {
  expect(tokenNames("type.weight.semibold")).toEqual({
    figma: "type/weight/semibold",
    cssVar: "--ds-type-weight-semibold",
    codeSyntax: "var(--ds-type-weight-semibold)",
  });
  expect(tokenNames("primitive.neutral.985")).not.toHaveProperty("className");
});
