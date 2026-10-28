// @vitest-environment node
// The fixtures module (spec § Fixtures for the P0 five): one shared dataset,
// every variant reachable by name, and each mock operation settling the same
// way every time under a given variant.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fixtureVariant,
  type Invoice,
  type Operations,
  variantNames,
} from "./fixtures.ts";

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

  // Each P1 brief's `requires.states`, as spec § The P1 set lists them.
  const p1States = {
    "bulk-pay": [
      "empty",
      "rows-selected",
      "payment-scheduled",
      "payment-failed",
    ],
    "overdue-invoices": [
      "empty",
      "rows-selected",
      "reminders-sent",
      "reminders-failed",
    ],
    "failed-payments": [
      "empty",
      "rows-selected",
      "payments-retried",
      "retry-failed",
    ],
    contractors: ["empty"],
    "run-history": ["empty"],
    "my-invoices": ["empty"],
    "payments-received": ["empty"],
    "payment-failed": ["retry-requested", "retry-failed"],
    "withdraw-invoice": ["invoice-withdrawn", "withdraw-failed"],
    "annual-summary": ["empty"],
  };
  const variantsOf = (states: Record<string, string[]>) =>
    Object.entries(states).flatMap(([brief, briefStates]) =>
      briefStates.map((state) => `${brief}/${state}`)
    );

  // The P0 variants come first, in spec order; every P1 brief's follow.
  it("names the default and one <brief>/<state> variant per screen state, P0 first", () => {
    const p0 = ["default", ...variantsOf(p0States)];

    expect(variantNames.slice(0, p0.length)).toEqual(p0);
    expect([...variantNames.slice(p0.length)].sort()).toEqual(
      variantsOf(p1States).sort()
    );
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

  // #293: an invoice's Sheet shows what its row doesn't, so every invoice
  // says what it's for and when it was issued, before it fell due.
  it("describes every invoice, and issues it before its due date", () => {
    const seen = new Map<string, Invoice>();
    for (const name of variantNames) {
      const { data } = fixtureVariant(name);
      for (const invoice of [
        ...data.invoices,
        ...data.yourInvoices,
        ...data.payQueue,
        ...data.overdueInvoices,
        data.overdueInvoice,
        data.reviewInvoice,
        data.awaitingInvoice,
      ]) {
        if (invoice) seen.set(invoice.id, invoice);
      }
    }

    expect(seen.size).toBe(9);
    for (const invoice of seen.values()) {
      expect(invoice.description, invoice.id).toMatch(/\S/);
      expect(invoice.issuedDate, invoice.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(invoice.issuedDate < invoice.dueDate, invoice.id).toBe(true);
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

  it("lists the payments you've received this year, newest first, each with the invoices it covered", () => {
    const { data } = fixtureVariant("default");

    expect(
      data.paymentsReceived.map((payment) => [
        payment.dateLabel,
        payment.amount,
        payment.invoicesLabel,
        payment.invoiceCountLabel,
      ])
    ).toEqual([
      ["Oct 10", 4800, "INV-0131", "1 invoice"],
      ["Sep 26", 6200, "INV-0124 and INV-0127", "2 invoices"],
      ["Sep 12", 3900, "INV-0119", "1 invoice"],
      ["Aug 29", 7350, "INV-0109, INV-0112 and INV-0115", "3 invoices"],
      ["Jul 18", 9550, "INV-0098 and INV-0103", "2 invoices"],
      ["Jun 6", 9400, "INV-0084, INV-0089 and INV-0091", "3 invoices"],
    ]);
    expect(data.paymentsReceived[0]).toMatchObject({
      id: "PAY-2026-10-10",
      currency: "USD",
      status: "paid",
      date: "2026-10-10",
      invoiceNumbers: ["INV-0131"],
      invoiceCount: 1,
    });
    // The newest is your last payment, and together they're this year's 41,200.
    expect(data.lastPayment).toMatchObject({ invoiceId: "INV-0131" });
    expect(
      data.paymentsReceived.reduce((sum, each) => sum + each.amount, 0)
    ).toBe(41200);
    expect(new Set(data.paymentsReceived.map((each) => each.id)).size).toBe(6);
  });

  it("has no payments received in payments-received/empty", () => {
    expect(
      fixtureVariant("payments-received/empty").data.paymentsReceived
    ).toEqual([]);
  });

  it("shows you, the contractor, your one bounced payment and why it bounced", () => {
    expect(fixtureVariant("default").data.bouncedPayment).toEqual({
      id: "PAY-0138",
      invoiceId: "INV-0138",
      contractorId: "ines-duarte",
      contractor: "Ines Duarte",
      amount: 3650,
      currency: "USD",
      status: "failed",
      date: "2026-10-17",
      dateLabel: "Oct 17",
      reason:
        "Your bank sent it back: it went over your account's daily limit for incoming transfers.",
    });
  });

  it("shows the same bounced payment under both retry variants", () => {
    const { bouncedPayment } = fixtureVariant("default").data;

    expect(
      fixtureVariant("payment-failed/retry-requested").data.bouncedPayment
    ).toEqual(bouncedPayment);
    expect(
      fixtureVariant("payment-failed/retry-failed").data.bouncedPayment
    ).toEqual(bouncedPayment);
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

  // bulk-pay's table: the invoices awaiting approval, which stay in it once
  // paid, scheduled, so the paid rows change status in place.
  const queued = (name: string) =>
    fixtureVariant(name).data.payQueue.map((each) => [each.id, each.status]);

  it("queues the 3 awaiting invoices to pay in the default variant", () => {
    expect(queued("default")).toEqual([
      ["INV-0147", "awaiting"],
      ["INV-0148", "awaiting"],
      ["INV-0149", "awaiting"],
    ]);
  });

  it("keeps the paid invoices in the queue, scheduled, in bulk-pay/payment-scheduled", () => {
    expect(queued("bulk-pay/payment-scheduled")).toEqual([
      ["INV-0147", "scheduled"],
      ["INV-0148", "scheduled"],
      ["INV-0149", "scheduled"],
    ]);
  });

  it("has nothing to pay in bulk-pay/empty", () => {
    expect(queued("bulk-pay/empty")).toEqual([]);
  });

  it.each(["bulk-pay/rows-selected", "bulk-pay/payment-failed"])(
    "leaves the invoices as they were under %s, with the awaiting ones selected",
    (name) => {
      const variant = fixtureVariant(name);
      expect(variant.data).toEqual(fixtureVariant("default").data);
      expect(variant.selected).toEqual(["INV-0147", "INV-0148", "INV-0149"]);
    }
  );

  it("keeps the run date with nothing in it in payment-run/empty", () => {
    expect(fixtureVariant("payment-run/empty").data.paymentRun).toEqual({
      date: "2026-10-24",
      dateLabel: "Oct 24",
      dueInRun: null,
      overdue: null,
      awaitingApproval: null,
    });
  });

  it("lists every contractor's overdue invoices for the admin, by number", () => {
    expect(
      fixtureVariant("default").data.overdueInvoices.map((each) => [
        each.id,
        each.contractor,
        each.status,
      ])
    ).toEqual([
      ["INV-0142", "Ines Duarte", "overdue"],
      ["INV-0144", "Lea Brandt", "overdue"],
    ]);
  });

  it("has no overdue invoices in overdue-invoices/empty", () => {
    expect(
      fixtureVariant("overdue-invoices/empty").data.overdueInvoices
    ).toEqual([]);
  });

  it.each([
    "overdue-invoices/rows-selected",
    "overdue-invoices/reminders-failed",
  ])("starts %s with every overdue invoice selected", (name) => {
    expect(fixtureVariant(name).selected).toEqual(["INV-0142", "INV-0144"]);
  });

  it.each([
    "overdue-invoices/rows-selected",
    "overdue-invoices/reminders-sent",
    "overdue-invoices/reminders-failed",
  ])("leaves the invoices as they were under %s", (name) => {
    expect(fixtureVariant(name).data).toEqual(fixtureVariant("default").data);
  });

  it("lists the admin the payments that bounced, by invoice, with the bank's reason, yours among them", () => {
    const { failedPayments, bouncedPayment } = fixtureVariant("default").data;

    expect(bouncedPayment).toMatchObject({ invoiceId: "INV-0138" });
    expect(failedPayments).toEqual([
      bouncedPayment,
      {
        id: "PAY-0146",
        invoiceId: "INV-0146",
        contractorId: "jonah-whitfield-abernathy",
        contractor: "Jonah Whitfield-Abernathy",
        amount: 1620,
        currency: "USD",
        status: "failed",
        reason: "The bank closed the account.",
        date: "2026-10-13",
        dateLabel: "Oct 13",
      },
    ]);
  });

  // One story across the admin's and your screens: the Oct 10 run sent both
  // payments that bounced, each bounced after it and before the next run, and
  // it is the one past run that failed.
  it("sent every bounced payment in the Oct 10 run, which failed by their total", () => {
    const { failedPayments, pastRuns, paymentRun } =
      fixtureVariant("default").data;
    const [oct10, ...earlier] = pastRuns;

    expect(oct10).toMatchObject({
      date: "2026-10-10",
      status: "failed",
      failedCountLabel: "2 invoices",
      failedAmount: 5270,
    });
    expect(failedPayments.map((each) => each.amount)).toEqual([3650, 1620]);
    expect(earlier.map((each) => each.status)).toEqual([
      "paid",
      "paid",
      "paid",
      "paid",
    ]);
    for (const each of failedPayments) {
      expect(each.date > oct10!.date, each.id).toBe(true);
      expect(each.date < paymentRun.date, each.id).toBe(true);
    }
  });

  it("has no failed payments in failed-payments/empty, yours included", () => {
    const { data } = fixtureVariant("failed-payments/empty");

    expect(data.failedPayments).toEqual([]);
    expect(data.bouncedPayment).toBeNull();
  });

  it.each(["failed-payments/rows-selected", "failed-payments/retry-failed"])(
    "starts %s with every failed payment selected, and the data as it was",
    (name) => {
      const { data, selected } = fixtureVariant(name);

      expect(selected).toEqual(["PAY-0138", "PAY-0146"]);
      expect(data).toEqual(fixtureVariant("default").data);
    }
  );

  it("schedules the retried payments and the failed invoice, and only them, in failed-payments/payments-retried", () => {
    const { data } = fixtureVariant("failed-payments/payments-retried");

    expect(data.failedPayments.map((each) => [each.id, each.status])).toEqual([
      ["PAY-0138", "scheduled"],
      ["PAY-0146", "scheduled"],
    ]);
    expect(data.bouncedPayment).toEqual(data.failedPayments[0]);
    expect(statuses("failed-payments/payments-retried")).toEqual({
      ...statuses("default"),
      "INV-0146": "scheduled",
    });
  });

  it("lists every contractor for the admin, with their invoices still open and what those come to", () => {
    expect(
      fixtureVariant("default").data.contractors.map(
        ({ name, country, openInvoices, openInvoicesLabel, owed }) => [
          name,
          country,
          openInvoices,
          openInvoicesLabel,
          owed,
        ]
      )
    ).toEqual([
      ["Ines Duarte", "Portugal", 3, "3 invoices", 10850],
      ["Lea Brandt", "Germany", 1, "1 invoice", 3100],
      ["Tomás Herrera", "Mexico", 2, "2 invoices", 4000],
      ["Jonah Whitfield-Abernathy", "United Kingdom", 2, "2 invoices", 2600],
      ["Priya Raman", "India", 1, "1 invoice", 6375.5],
    ]);
  });

  // Your open invoices count INV-0138, whose payment bounced, beside your two
  // here.
  it("gives each contractor the details their sheet shows, your year's total included", () => {
    const { contractors, you, paidThisYear } = fixtureVariant("default").data;

    expect(contractors.find((each) => each.id === you.id)).toEqual({
      id: "ines-duarte",
      name: "Ines Duarte",
      country: "Portugal",
      email: "ines@duarte.studio",
      payoutMethod: "Bank transfer to an account ending 4417",
      openInvoices: 3,
      openInvoicesLabel: "3 invoices",
      owed: 10850,
      paidThisYear: paidThisYear!.amount,
      currency: "USD",
    });
  });

  it("has no contractors in contractors/empty", () => {
    expect(fixtureVariant("contractors/empty").data.contractors).toEqual([]);
  });

  it("lists the past payment runs newest first, each with its breakdown", () => {
    const { pastRuns, lastPayment } = fixtureVariant("default").data;

    expect(
      pastRuns.map(({ dateLabel, status, countLabel, amount }) => [
        dateLabel,
        status,
        countLabel,
        amount,
      ])
    ).toEqual([
      ["Oct 10", "failed", "7 invoices", 21690],
      ["Sep 26", "paid", "5 invoices", 17485.5],
      ["Sep 12", "paid", "4 invoices", 11250],
      ["Aug 29", "paid", "7 invoices", 21980],
      ["Aug 15", "paid", "3 invoices", 8400],
    ]);
    // Your last payment went out in the newest run.
    expect(pastRuns[0]!.date).toBe(lastPayment!.date);
    expect(pastRuns[0]).toEqual({
      id: "run-2026-10-10",
      date: "2026-10-10",
      dateLabel: "Oct 10",
      status: "failed",
      count: 7,
      countLabel: "7 invoices",
      amount: 21690,
      currency: "USD",
      contractorsLabel: "5 contractors",
      paidCountLabel: "5 invoices",
      paidAmount: 16420,
      failedCountLabel: "2 invoices",
      failedAmount: 5270,
    });
  });

  it("splits each past run into what went through and what bounced, failed only when a payment bounced", () => {
    for (const run of fixtureVariant("default").data.pastRuns) {
      expect(run.paidAmount + run.failedAmount).toBe(run.amount);
      expect(run.status).toBe(run.failedAmount > 0 ? "failed" : "paid");
    }
  });

  it("has no past runs in run-history/empty", () => {
    expect(fixtureVariant("run-history/empty").data.pastRuns).toEqual([]);
  });

  it("shows you, the contractor, your one invoice awaiting approval", () => {
    expect(fixtureVariant("default").data.awaitingInvoice).toEqual({
      id: "INV-0152",
      number: "INV-0152",
      contractorId: "ines-duarte",
      contractor: "Ines Duarte",
      client: "Northwind Logistics & Freight Holdings Ltd.",
      amount: 2950,
      currency: "USD",
      status: "awaiting",
      dueDate: "2026-11-19",
      dueLabel: "Nov 19",
      lineCount: 3,
      lineCountLabel: "3 lines",
    });
  });

  it("drops your awaiting invoice, and only it, in withdraw-invoice/invoice-withdrawn", () => {
    const { data } = fixtureVariant("withdraw-invoice/invoice-withdrawn");
    const before = fixtureVariant("default").data;

    expect(data.awaitingInvoice).toBeNull();
    expect({ ...data, awaitingInvoice: before.awaitingInvoice }).toEqual(
      before
    );
  });

  it("leaves your awaiting invoice as it was in withdraw-invoice/withdraw-failed", () => {
    expect(fixtureVariant("withdraw-invoice/withdraw-failed").data).toEqual(
      fixtureVariant("default").data
    );
  });

  it("totals the payments you've received by month, newest first, to this year's 41,200", () => {
    const { monthlyTotals, paidThisYear } = fixtureVariant("default").data;

    expect(
      monthlyTotals.map((each) => [
        each.id,
        each.monthLabel,
        each.amount,
        each.paymentCountLabel,
        each.invoiceCountLabel,
      ])
    ).toEqual([
      ["2026-10", "October", 4800, "1 payment", "1 invoice"],
      ["2026-09", "September", 10100, "2 payments", "3 invoices"],
      ["2026-08", "August", 7350, "1 payment", "3 invoices"],
      ["2026-07", "July", 9550, "1 payment", "2 invoices"],
      ["2026-06", "June", 9400, "1 payment", "3 invoices"],
    ]);
    expect(monthlyTotals.reduce((sum, each) => sum + each.amount, 0)).toBe(
      paidThisYear!.amount
    );
  });

  it("averages this year's 41,200 over the 5 months you've been paid in", () => {
    expect(fixtureVariant("default").data.monthlyAverage).toEqual({
      amount: 8240,
      currency: "USD",
    });
  });

  it("has nothing paid this year in annual-summary/empty", () => {
    const { data } = fixtureVariant("annual-summary/empty");

    expect(data.paidThisYear).toBeNull();
    expect(data.monthlyAverage).toBeNull();
    expect(data.monthlyTotals).toEqual([]);
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
      "bulk-pay/rows-selected",
      "bulk-pay/payment-scheduled",
    ])("succeeds after exactly 1,800ms under %s", async (name) => {
      expect(await settle(name)).toEqual({
        early: undefined,
        settled: "resolved",
      });
    });

    it.each([
      "invoice-queue/payment-failed",
      "invoice-review/payment-failed",
      "bulk-pay/payment-failed",
    ])(
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

  describe("sendReminders", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const settle = (name: string) =>
      settleOperation(name, (operations) =>
        operations.sendReminders(["INV-0142", "INV-0144"])
      );

    it.each([
      "default",
      "overdue-invoices/rows-selected",
      "overdue-invoices/reminders-sent",
      "payment-status/reminder-failed",
    ])("succeeds after exactly 1,800ms under %s", async (name) => {
      expect(await settle(name)).toEqual({
        early: undefined,
        settled: "resolved",
      });
    });

    it("fails after exactly 1,800ms under overdue-invoices/reminders-failed, naming the invoices", async () => {
      const { early, settled } = await settle(
        "overdue-invoices/reminders-failed"
      );

      expect(early).toBeUndefined();
      expect(settled).toMatch(/^rejected: .*INV-0142, INV-0144/);
    });

    it("leaves sendReminder succeeding where only sendReminders fails", async () => {
      expect(
        await settleOperation(
          "overdue-invoices/reminders-failed",
          (operations) => operations.sendReminder("INV-0142")
        )
      ).toEqual({ early: undefined, settled: "resolved" });
    });
  });

  describe("retryPayments", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const settle = (name: string) =>
      settleOperation(name, (operations) =>
        operations.retryPayments(["PAY-0146"])
      );

    it.each([
      "default",
      "failed-payments/rows-selected",
      "failed-payments/payments-retried",
      "invoice-queue/payment-failed",
    ])("succeeds after exactly 1,800ms under %s", async (name) => {
      expect(await settle(name)).toEqual({
        early: undefined,
        settled: "resolved",
      });
    });

    it("fails after exactly 1,800ms under failed-payments/retry-failed, naming the payments", async () => {
      const { early, settled } = await settle("failed-payments/retry-failed");

      expect(early).toBeUndefined();
      expect(settled).toMatch(/^rejected: .*PAY-0146/);
    });

    it("leaves payInvoices succeeding where only retryPayments fails", async () => {
      expect(
        await settleOperation("failed-payments/retry-failed", (operations) =>
          operations.payInvoices(["INV-0147"])
        )
      ).toEqual({ early: undefined, settled: "resolved" });
    });
  });

  describe("requestRetry", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const settle = (name: string) =>
      settleOperation(name, (operations) =>
        operations.requestRetry("PAY-0138")
      );

    it.each(["default", "payment-failed/retry-requested"])(
      "succeeds after exactly 1,800ms under %s",
      async (name) => {
        expect(await settle(name)).toEqual({
          early: undefined,
          settled: "resolved",
        });
      }
    );

    it("fails after exactly 1,800ms under payment-failed/retry-failed, naming the payment", async () => {
      const { early, settled } = await settle("payment-failed/retry-failed");

      expect(early).toBeUndefined();
      expect(settled).toMatch(/^rejected: .*PAY-0138/);
    });

    it("leaves sendReminder succeeding where only requestRetry fails", async () => {
      expect(
        await settleOperation("payment-failed/retry-failed", (operations) =>
          operations.sendReminder("INV-0142")
        )
      ).toEqual({ early: undefined, settled: "resolved" });
    });
  });

  describe("withdrawInvoice", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const settle = (name: string) =>
      settleOperation(name, (operations) =>
        operations.withdrawInvoice("INV-0152")
      );

    it.each(["default", "withdraw-invoice/invoice-withdrawn"])(
      "succeeds after exactly 1,800ms under %s",
      async (name) => {
        expect(await settle(name)).toEqual({
          early: undefined,
          settled: "resolved",
        });
      }
    );

    it("fails after exactly 1,800ms under withdraw-invoice/withdraw-failed, naming the invoice", async () => {
      const { early, settled } = await settle(
        "withdraw-invoice/withdraw-failed"
      );

      expect(early).toBeUndefined();
      expect(settled).toMatch(/^rejected: .*INV-0152/);
    });

    it("leaves requestRetry succeeding where only withdrawInvoice fails", async () => {
      expect(
        await settleOperation(
          "withdraw-invoice/withdraw-failed",
          (operations) => operations.requestRetry("PAY-0138")
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
