// @vitest-environment node
// The fixtures module (spec § Fixtures and the screen brief): every variant
// is reachable by name, and the mock operation settles the same way every
// time under a given variant.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureVariant, variantNames } from "./fixtures.ts";

describe("fixtures", () => {
  it("names the default and each payment-status variant", () => {
    expect(variantNames).toEqual([
      "default",
      "payment-status/empty",
      "payment-status/reminder-sent",
      "payment-status/reminder-failed",
    ]);
  });

  it.each(variantNames)("reaches %s by name", (name) => {
    expect(fixtureVariant(name).name).toBe(name);
  });

  it("fails a variant name it doesn't have, listing the ones it does", () => {
    expect(() => fixtureVariant("payment-status/loading")).toThrow(
      /payment-status\/empty/
    );
  });

  it("holds INV-0142 for Northwind, overdue, in the default variant", () => {
    const { data } = fixtureVariant("default");

    expect(data.overdueInvoice).toEqual({
      id: "INV-0142",
      number: "INV-0142",
      client: "Northwind Logistics & Freight Holdings Ltd.",
      amount: 4800,
      currency: "USD",
      status: "overdue",
      dueDate: "2026-10-08",
      dueLabel: "Oct 8",
    });
    expect(data.invoices).toEqual([data.overdueInvoice]);
  });

  it("has no invoices in the empty variant", () => {
    const { data } = fixtureVariant("payment-status/empty");

    expect(data.invoices).toEqual([]);
    expect(data.overdueInvoice).toBeNull();
  });

  it("shows the same invoice under both reminder variants", () => {
    const { overdueInvoice } = fixtureVariant("default").data;

    expect(
      fixtureVariant("payment-status/reminder-sent").data.overdueInvoice
    ).toEqual(overdueInvoice);
    expect(
      fixtureVariant("payment-status/reminder-failed").data.overdueInvoice
    ).toEqual(overdueInvoice);
  });

  describe("sendReminder", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    async function settle(name: string) {
      const { operations } = fixtureVariant(name);
      const outcome = operations.sendReminder("INV-0142").then(
        () => "resolved",
        (error: unknown) => `rejected: ${(error as Error).message}`
      );
      let settled: string | undefined;
      void outcome.then((value) => (settled = value));
      await vi.advanceTimersByTimeAsync(1799);
      const early = settled;
      await vi.advanceTimersByTimeAsync(1);
      return { early, settled };
    }

    it.each([
      "default",
      "payment-status/empty",
      "payment-status/reminder-sent",
    ])("succeeds after exactly 1,800ms under %s", async (name) => {
      expect(await settle(name)).toEqual({
        early: undefined,
        settled: "resolved",
      });
    });

    it("fails after exactly 1,800ms under reminder-failed", async () => {
      const { early, settled } = await settle("payment-status/reminder-failed");

      expect(early).toBeUndefined();
      expect(settled).toMatch(/^rejected: /);
    });

    it("settles the same way on every call", async () => {
      const results: (string | undefined)[] = [];
      for (let i = 0; i < 3; i++) {
        results.push(
          (await settle("payment-status/reminder-failed")).settled,
          (await settle("payment-status/reminder-sent")).settled
        );
      }

      const [failed] = results;
      expect(failed).toMatch(/^rejected: /);
      expect(results).toEqual([
        ...[failed, "resolved"],
        ...[failed, "resolved"],
        ...[failed, "resolved"],
      ]);
    });
  });
});
