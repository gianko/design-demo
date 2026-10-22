// Which stories the Playwright pass renders, read from the built Storybook's
// index.json. Each one renders in every theme × density (ADR 0006).

import {
  densities,
  themes,
  type Density,
  type Theme,
} from "../.storybook/globals.ts";

export type Story = { id: string; title: string; tags: string[] };

export type Render = Story & { theme: Theme; density: Density };

type IndexEntry = { type: string; id: string; title: string; tags?: string[] };

// A story tagged this way animates while idle, so the rest shot (animations
// disabled) can't show it and it also gets a mid-animation shot.
export const animatesWhileIdle = "animates-while-idle";

// `pnpm gate <Component|screen>` names a story title's last segment, so
// "Button" picks "Button" and "Library/Button" but not "ButtonGroup". With no
// target, every story is gated. A target that matches nothing is an error, so
// a typo can't pass by gating nothing.
export function selectStories(
  index: { entries: Record<string, IndexEntry> },
  target?: string
): Story[] {
  const stories = Object.values(index.entries)
    .filter((entry) => entry.type === "story")
    .filter((entry) => !target || entry.title.split("/").at(-1) === target)
    .map(({ id, title, tags = [] }) => ({ id, title, tags }));
  if (stories.length === 0) {
    throw new Error(
      target
        ? `No story is titled "${target}" or ".../${target}".`
        : "The Storybook build has no stories."
    );
  }
  return stories;
}

export function renders(stories: Story[]): Render[] {
  return stories.flatMap((story) =>
    themes.flatMap((theme) =>
      densities.map((density) => ({ ...story, theme, density }))
    )
  );
}

// The baseline's name, as ADR 0009 fixes it: <story-id>--<theme>-<density>.
export function shotName({ id, theme, density }: Render): string {
  return `${id}--${theme}-${density}`;
}
