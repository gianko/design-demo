import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Screen } from "../Screen/Screen.tsx";
import { Text } from "./Text.tsx";

afterEach(cleanup);

// ADR 0016: an action's result is a Notice or a Toast, which announce
// themselves; a Text is never one, so it leaves Screen's status region alone.
it("announces nothing, even in a Screen", () => {
  render(
    <Screen audience="contractor">
      <Text text="Reminder sent to Northwind. We'll tell you when they pay." />
    </Screen>
  );

  expect(screen.getByRole("status").textContent).toBe("");
});
