// Which stories the Playwright pass renders, read from the built Storybook's
// index.json. Each one renders in every theme × density (ADR 0006).

import {
  densities,
  themes,
  type Density,
  type Theme,
} from "../.storybook/globals.ts";
import type { RenderFinding } from "../lint/taste/render.ts";

export type Story = { id: string; tags: string[] };

export type Render = Story & { theme: Theme; density: Density };

type IndexEntry = { type: string; id: string; title: string; tags?: string[] };

// A story tagged this way animates while idle, so the rest shot (animations
// disabled) can't show it and it also gets a mid-animation shot.
export const animatesWhileIdle = "animates-while-idle";

// Each target of `pnpm gate <Component|screen>...` names a story title's last
// segment, so "Button" picks "Button" and "Library/Button" but not
// "ButtonGroup". With no target, every story is gated. A target that matches
// nothing is an error, so a typo can't pass by gating nothing.
export function selectStories(
  index: { entries: Record<string, IndexEntry> },
  targets: string[] = []
): Story[] {
  const entries = Object.values(index.entries).filter(
    (entry) => entry.type === "story"
  );
  if (entries.length === 0) {
    throw new Error("The Storybook build has no stories.");
  }
  const segment = (entry: IndexEntry) => entry.title.split("/").at(-1)!;
  for (const target of targets) {
    if (!entries.some((entry) => segment(entry) === target)) {
      throw new Error(`No story is titled "${target}" or ".../${target}".`);
    }
  }
  return entries
    .filter((entry) => targets.length === 0 || targets.includes(segment(entry)))
    .map(({ id, tags = [] }) => ({ id, tags }));
}

// How run.ts hands the targets to the Playwright pass in the image.
export const targetsEnv = {
  write: (targets: string[]) => targets.join(",") || undefined,
  read: (value: string | undefined) => (value ? value.split(",") : []),
};

export function renders(stories: Story[]): Render[] {
  return stories.flatMap((story) =>
    themes.flatMap((theme) =>
      densities.map((density) => ({ ...story, theme, density }))
    )
  );
}

// The test title of a render, under its story's id, so every failure names
// the story, theme and density.
export function renderTitle({ theme, density }: Render): string {
  return `${theme} · ${density}`;
}

// The baseline's name, as ADR 0009 fixes it: <story-id>--<theme>-<density>.
export function shotName({ id, theme, density }: Render): string {
  return `${id}--${theme}-${density}`;
}

// The shots the pass attaches to each render, which the contact sheet shows.
export const shots = [
  "rest",
  "focus",
  "hover",
  "pressed",
  "mid-animation",
] as const;

export type Shot = (typeof shots)[number];

// What the pass tells the contact sheet about a render: its shot name, and
// that its baseline was written this run.
export const annotation = {
  shot: "shot",
  newBaseline: "new baseline",
  // The attachment that holds a render's Checks.
  checks: "checks",
} as const;

// One render's gate 4 violations, and its render-time taste failures by rule.
export type Checks = {
  axe: {
    id: string;
    help: string;
    nodes: { target: string; html: string }[];
  }[];
  taste: Record<string, RenderFinding[]>;
};
