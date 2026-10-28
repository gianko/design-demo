import { composeStory, type Meta, type StoryObj } from "@storybook/react-vite";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { densities, themes } from "./globals";
import preview from "./preview";

afterEach(cleanup);

// A story of this test's own, so the decorator is checked without depending
// on any library component.
const meta = {
  title: "PreviewTest",
  render: () => <p>Story</p>,
} satisfies Meta;

const story: StoryObj<typeof meta> = {};

const combinations = themes.flatMap((theme) =>
  densities.map((density) => [theme, density] as const)
);

it.each(combinations)("renders a story under %s × %s", (theme, density) => {
  const Story = composeStory(story, meta, {
    ...preview,
    initialGlobals: { theme, density },
  });
  render(<Story />);

  const rendered = screen.getByText("Story");
  expect(rendered.closest("[data-theme]")?.getAttribute("data-theme")).toBe(
    theme
  );
  expect(rendered.closest("[data-density]")?.getAttribute("data-density")).toBe(
    density
  );
});
