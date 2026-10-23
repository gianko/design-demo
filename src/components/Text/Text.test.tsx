import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Screen } from "../Screen/Screen.tsx";
import { Text } from "./Text.tsx";

afterEach(cleanup);

const confirmation =
  "Reminder sent to Northwind. We'll tell you when they pay.";

// A screen state change, as the library makes one: the state's content
// replaces the last state's inside the same Screen.
function ReminderScreen({ state }: { state: "empty" | "reminder-sent" }) {
  return (
    <Screen audience="contractor">
      <Text text="Northwind hasn't paid INV-0142 yet." />
      {state === "reminder-sent" && <Text live text={confirmation} />}
    </Screen>
  );
}

it("puts a live Text's copy into the Screen's status region when its state is entered", () => {
  const { rerender } = render(<ReminderScreen state="empty" />);
  const region = screen.getByRole("status");
  expect(region.textContent).toBe("");

  rerender(<ReminderScreen state="reminder-sent" />);

  expect(screen.getByRole("status")).toBe(region);
  expect(region.textContent).toBe(confirmation);
});

it("renders a live Text as an ordinary paragraph, not a second status region", () => {
  render(<ReminderScreen state="reminder-sent" />);

  const paragraph = screen
    .getAllByText(confirmation)
    .find((el) => el !== screen.getByRole("status"));
  expect(paragraph?.tagName).toBe("P");
  expect(paragraph?.getAttribute("role")).toBeNull();
  expect(screen.getAllByRole("status")).toHaveLength(1);
});

it("announces nothing for a Text that isn't live", () => {
  render(<ReminderScreen state="empty" />);

  expect(screen.getByRole("status").textContent).toBe("");
});
