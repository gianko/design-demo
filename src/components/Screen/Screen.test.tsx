import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Screen } from "./Screen.tsx";

afterEach(cleanup);

it("renders one empty, polite status region before anything is announced", () => {
  render(
    <Screen audience="contractor">
      <p>Your invoices</p>
    </Screen>
  );

  const region = screen.getByRole("status");
  expect(region.textContent).toBe("");
  expect(region.getAttribute("aria-live") ?? "polite").toBe("polite");
  expect(screen.getAllByRole("status")).toHaveLength(1);
});
