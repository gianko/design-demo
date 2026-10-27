// @vitest-environment node
// The fixtures module (spec § Fixtures for the P0 five): one shared dataset,
// every variant reachable by name, and each mock operation settling the same
// way every time under a given variant.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureVariant, type Operations, variantNames } from "./fixtures.ts";

describe("fixtures", () => {
  // Each P0 brief's `requires.states`, as spec § The P0 five lists them.
  const p0States = {
    "payment-status": ["empty", "reminder-sent", "reminder-failed"],
    "payment-overview": ["empty"],
    "invoice-queue": [
      "empty",
      "rows-selected",
      "payment-scheduled",
      "payment-failed",
    ],
    "invoice-review": ["payment-scheduled", "payment-failed"],
    "payment-run": ["empty"],
  };

  // Later briefs add their own variants; the brief-set test checks those.
  it("names the default and one <brief>/<state> variant per P0 screen state", () => {
    expect(variantNames).toEqual(
      expect.arrayContaining([
        "default",
        ...Object.entries(p0States).flatMap(([brief, states]) =>
          states.map((state) => `${brief}/${state}`)
        ),
      ])
    );
    expect(
      variantNames.filter(
        (name) => name !== "default" && !/^[a-z-]+\/[a-z-]+$/.test(name)
      )
    ).toEqual([]);
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

    expect(data.overdueInvoice).toMatchObject({
      id: "INV-0142",
      number: "INV-0142",
      client: "Northwind Logistics & Freight Holdings Ltd.",
      amount: 4800,
      currency: "USD",
      status: "overdue",
      dueDate: "2026-10-08",
      dueLabel: "Oct 8",
    });
    expect(data.invoices).toContainEqual(data.overdueInvoice);
  });

  it("shares one dataset of 8 invoices across 5 contractors, each named by its id", () => {
    const { invoices } = fixtureVariant("default").data;

    expect(invoices.map((invoice) => invoice.id)).toEqual([
      "INV-0142",
      "INV-0144",
      "INV-0145",
      "INV-0146",
      "INV-0147",
      "INV-0148",
      "INV-0149",
      "INV-0151",
    ]);
    const contractors = new Map(
      invoices.map((invoice) => [invoice.contractorId, invoice.contractor])
    );
    expect(contractors.size).toBe(5);
    expect(new Set(contractors.values()).size).toBe(5);
  });

  it("gives the contractor screens your invoices, matched by your id", () => {
    const { invoices, you, yourInvoices } = fixtureVariant("default").data;

    expect(you).toEqual({ id: "ines-duarte", name: "Ines Duarte" });
    expect(yourInvoices.map((invoice) => [invoice.id, invoice.status])).toEqual(
      [
        ["INV-0142", "overdue"],
        ["INV-0151", "scheduled"],
      ]
    );
    expect(yourInvoices).toEqual(
      invoices.filter((invoice) => invoice.contractorId === you.id)
    );
  });

  it("carries a label beside every ISO date", () => {
    const dates: [string, string][] = [];
    const walk = (value: unknown) => {
      if (typeof value !== "object" || value === null) return;
      const record = value as Record<string, unknown>;
      for (const [key, child] of Object.entries(record)) {
        if (/date$/i.test(key)) {
          const label =
            record[key.replace(/date$/i, "") + "Label"] ??
            record[key + "Label"];
          dates.push([String(child), String(label)]);
        }
        walk(child);
      }
    };
    for (const name of variantNames) walk(fixtureVariant(name).data);

    expect(dates.length).toBeGreaterThan(0);
    for (const [iso, label] of dates) {
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(label).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    }
  });

  it("shows you, the contractor, your next and last payment and this year's total", () => {
    const { data } = fixtureVariant("default");

    expect(data.nextPayment).toEqual({
      invoiceId: "INV-0151",
      amount: 2400,
      currency: "USD",
      status: "scheduled",
      date: "2026-10-24",
      dateLabel: "Oct 24",
    });
    expect(data.lastPayment).toMatchObject({
      amount: 4800,
      currency: "USD",
      status: "paid",
      dateLabel: "Oct 10",
    });
    expect(data.paidThisYear).toEqual({ amount: 41200, currency: "USD" });
  });

  it("shows the admin one awaiting invoice to review, with its line count", () => {
    expect(fixtureVariant("default").data.reviewInvoice).toMatchObject({
      id: "INV-0148",
      status: "awaiting",
      amount: 6375.5,
      dueLabel: "Nov 2",
      lineCount: 4,
      lineCountLabel: "4 lines",
    });
  });

  it("totals the next payment run by status", () => {
    expect(fixtureVariant("default").data.paymentRun).toEqual({
      date: "2026-10-24",
      dateLabel: "Oct 24",
      dueInRun: {
        status: "scheduled",
        amount: 5150,
        currency: "USD",
        count: 2,
        countLabel: "2 invoices",
      },
      overdue: {
        status: "overdue",
        amount: 7900,
        currency: "USD",
        count: 2,
        countLabel: "2 invoices",
      },
      awaitingApproval: {
        status: "awaiting",
        amount: 8605.5,
        currency: "USD",
        count: 3,
        countLabel: "3 invoices",
      },
    });
  });

  it("has none of your invoices or payments in payment-status/empty", () => {
    const { data } = fixtureVariant("payment-status/empty");

    expect(data.overdueInvoice).toBeNull();
    expect(data.yourInvoices).toEqual([]);
    expect(
      data.invoices.filter((invoice) => invoice.contractorId === data.you.id)
    ).toEqual([]);
    // The other contractors' invoices are still in the admin's queue.
    expect(data.invoices).toHaveLength(6);
    expect(data.nextPayment).toBeNull();
    expect(data.lastPayment).toBeNull();
    expect(data.paidThisYear).toBeNull();
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

  it("has no payments of yours in payment-overview/empty", () => {
    const { data } = fixtureVariant("payment-overview/empty");

    expect(data.nextPayment).toBeNull();
    expect(data.lastPayment).toBeNull();
    expect(data.paidThisYear).toBeNull();
  });

  it("has no invoices in invoice-queue/empty", () => {
    expect(fixtureVariant("invoice-queue/empty").data.invoices).toEqual([]);
  });

  it.each([
    "invoice-queue/rows-selected",
    "invoice-queue/payment-failed",
    "invoice-review/payment-failed",
  ])("leaves the invoices as they were under %s", (name) => {
    expect(fixtureVariant(name).data).toEqual(fixtureVariant("default").data);
  });

  const statuses = (name: string) =>
    Object.fromEntries(
      fixtureVariant(name).data.invoices.map((each) => [each.id, each.status])
    );

  it("schedules the 3 awaiting invoices, and only them, in invoice-queue/payment-scheduled", () => {
    const { data } = fixtureVariant("invoice-queue/payment-scheduled");

    expect(statuses("invoice-queue/payment-scheduled")).toEqual({
      "INV-0142": "overdue",
      "INV-0144": "overdue",
      "INV-0145": "scheduled",
      "INV-0146": "failed",
      "INV-0147": "scheduled",
      "INV-0148": "scheduled",
      "INV-0149": "scheduled",
      "INV-0151": "scheduled",
    });
    expect(data.paymentRun.dueInRun).toMatchObject({
      amount: 13755.5,
      count: 5,
      countLabel: "5 invoices",
    });
    expect(data.paymentRun.awaitingApproval).toBeNull();
  });

  it("schedules the reviewed invoice, and only it, in invoice-review/payment-scheduled", () => {
    const { data } = fixtureVariant("invoice-review/payment-scheduled");

    expect(data.reviewInvoice).toMatchObject({
      id: "INV-0148",
      status: "scheduled",
    });
    expect(statuses("invoice-review/payment-scheduled")).toEqual({
      ...statuses("default"),
      "INV-0148": "scheduled",
    });
  });

  it("keeps the run date with nothing in it in payment-run/empty", () => {
    expect(fixtureVariant("payment-run/empty").data.paymentRun).toEqual({
      date: "2026-10-24",
      dateLabel: "Oct 24",
      dueInRun: null,
      overdue: null,
      awaitingApproval: null,
    });
  });

  // Runs one operation under a variant, and reports how it stood just before
  // and at 1,800ms.
  async function settleOperation(
    name: string,
    run: (operations: Operations) => Promise<void>
  ) {
    const outcome = run(fixtureVariant(name).operations).then(
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

  describe("payInvoices", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const settle = (name: string) =>
      settleOperation(name, (operations) =>
        operations.payInvoices(["INV-0147", "INV-0148", "INV-0149"])
      );

    it.each([
      "default",
      "invoice-queue/rows-selected",
      "invoice-queue/payment-scheduled",
      "invoice-review/payment-scheduled",
      "payment-status/reminder-failed",
    ])("succeeds after exactly 1,800ms under %s", async (name) => {
      expect(await settle(name)).toEqual({
        early: undefined,
        settled: "resolved",
      });
    });

    it.each(["invoice-queue/payment-failed", "invoice-review/payment-failed"])(
      "fails after exactly 1,800ms under %s, naming the invoices",
      async (name) => {
        const { early, settled } = await settle(name);

        expect(early).toBeUndefined();
        expect(settled).toMatch(/^rejected: .*INV-0147, INV-0148, INV-0149/);
      }
    );

    it("settles the same way on every call", async () => {
      const results: (string | undefined)[] = [];
      for (let i = 0; i < 3; i++) {
        results.push(
          (await settle("invoice-queue/payment-failed")).settled,
          (await settle("invoice-queue/payment-scheduled")).settled
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

    it("leaves sendReminder succeeding where only payInvoices fails", async () => {
      expect(
        await settleOperation("invoice-queue/payment-failed", (operations) =>
          operations.sendReminder("INV-0142")
        )
      ).toEqual({ early: undefined, settled: "resolved" });
    });
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
