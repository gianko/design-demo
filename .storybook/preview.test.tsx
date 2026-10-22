import { composeStories } from "@storybook/react-vite";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import * as stories from "../src/placeholder.stories";
import { densities, themes } from "./globals";
import preview from "./preview";

afterEach(cleanup);

const combinations = themes.flatMap((theme) =>
  densities.map((density) => [theme, density] as const)
);

it.each(combinations)("renders a story under %s × %s", (theme, density) => {
  const { Placeholder } = composeStories(stories, {
    ...preview,
    initialGlobals: { theme, density },
  });
  render(<Placeholder />);

  const story = screen.getByText("Placeholder");
  expect(story.closest("[data-theme]")?.getAttribute("data-theme")).toBe(theme);
  expect(story.closest("[data-density]")?.getAttribute("data-density")).toBe(
    density
  );
});
