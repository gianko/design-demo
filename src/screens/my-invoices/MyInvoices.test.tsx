// The kept my-invoices screen's open-sheet render, as the gate shoots it:
// an invoice's Sheet shows its amount and status, then only facts no column
// shows (#293). The stories compose with the Storybook preview, whose
// ScreenHost opens the first row's Sheet.

import { composeStories } from "@storybook/react-vite";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import preview from "../../../.storybook/preview.tsx";
import * as stories from "./MyInvoices.stories.tsx";

const { DefaultSheetOpen } = composeStories(stories, preview);

afterEach(cleanup);

it("shows no column's fact in an invoice's Sheet but the amount and status", () => {
  render(<DefaultSheetOpen />);

  const table = document.querySelector('[data-component="DataTable"]')!;
  const sheet = screen.getByRole("dialog", { name: "INV-0142" });
  const columns = [...table.querySelectorAll("thead th")].map(
    (header) => header.textContent
  );
  const [cells] = [...table.querySelectorAll("tbody tr")].map((each) =>
    [...each.querySelectorAll("td")].map((cell) => cell.textContent)
  );
  // The body's facts: each element holding only text, the title left out.
  const facts = [...sheet.lastElementChild!.querySelectorAll("*")]
    .filter((each) => each.children.length === 0)
    .map((each) => each.textContent);
  const repeated = columns.filter(
    (column, at) =>
      column !== "Amount" && column !== "Status" && facts.includes(cells![at]!)
  );

  expect(repeated).toEqual([]);
  expect(facts).toEqual(
    expect.arrayContaining([
      "September design retainer",
      "Sep 8",
      "Northwind Logistics & Freight Holdings Ltd.",
      "2 lines",
    ])
  );
});
