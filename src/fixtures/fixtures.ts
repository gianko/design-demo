// The fixtures (ADR 0004): the one fixed, typed set of sample data every
// generated screen renders, in named variants that a UI spec's screen states
// point at, and the mock async operations its actions run. Each operation
// settles after a fixed delay and fails only when the active variant says so,
// so every rep, baseline and capture sees the same thing.
//
// One dataset serves both audiences (spec § Fixtures): Northwind's admin pays
// 5 contractors' invoices, and the contractor screens view one of those
// contractors, "you", inside it. A variant is that dataset as its screen
// state shows it, named `<brief>/<state>`.

import type {
  Contractor,
  FailedPayment,
  ContractorAccount,
  FixtureData,
  Invoice,
  InvoiceStatus,
  PastRun,
  ReceivedPayment,
  RunGroup,
} from "./types.ts";

export type * from "./types.ts";

export const operationNames = [
  "sendReminder",
  "payInvoices",
  "sendReminders",
  "retryPayments",
  "requestRetry",
] as const;
export type OperationName = (typeof operationNames)[number];

// Long enough for a Button's progress edge to fill and sweep once.
export const operationDelayMs = 1800;

const you: Contractor = { id: "ines-duarte", name: "Ines Duarte" };
const lea: Contractor = { id: "lea-brandt", name: "Lea Brandt" };
const tomas: Contractor = { id: "tomas-herrera", name: "Tomás Herrera" };
const jonah: Contractor = {
  id: "jonah-whitfield-abernathy",
  name: "Jonah Whitfield-Abernathy",
};
const priya: Contractor = { id: "priya-raman", name: "Priya Raman" };
// Long on purpose, for the text-overflow taste rule.
const northwind = "Northwind Logistics & Freight Holdings Ltd.";
const run = { date: "2026-10-24", dateLabel: "Oct 24" };

function invoice(
  number: string,
  contractor: Contractor,
  amount: number,
  status: InvoiceStatus,
  [dueDate, dueLabel]: [string, string],
  lineCount: number
): Invoice {
  return {
    id: number,
    number,
    contractorId: contractor.id,
    contractor: contractor.name,
    client: northwind,
    amount,
    currency: "USD",
    status,
    dueDate,
    dueLabel,
    lineCount,
    lineCountLabel: counted(lineCount, "line"),
  };
}

function counted(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

// By number. INV-0142 is payment-status's invoice, as it was.
const invoices: readonly Invoice[] = [
  invoice("INV-0142", you, 4800, "overdue", ["2026-10-08", "Oct 8"], 2),
  invoice("INV-0144", lea, 3100, "overdue", ["2026-10-12", "Oct 12"], 3),
  invoice("INV-0145", tomas, 2750, "scheduled", ["2026-10-21", "Oct 21"], 1),
  invoice("INV-0146", jonah, 1620, "failed", ["2026-10-15", "Oct 15"], 2),
  invoice("INV-0147", tomas, 1250, "awaiting", ["2026-10-30", "Oct 30"], 1),
  invoice("INV-0148", priya, 6375.5, "awaiting", ["2026-11-02", "Nov 2"], 4),
  invoice("INV-0149", jonah, 980, "awaiting", ["2026-11-05", "Nov 5"], 2),
  invoice("INV-0151", you, 2400, "scheduled", ["2026-10-22", "Oct 22"], 1),
];

// The invoices awaiting approval before any is paid: bulk-pay's queue,
// which keeps them once they're scheduled.
const toPay: ReadonlySet<string> = new Set(
  invoices.filter((each) => each.status === "awaiting").map((each) => each.id)
);
// A payment you received, for invoices before these.
function received(
  [date, dateLabel]: [string, string],
  amount: number,
  invoiceNumbers: readonly string[]
): ReceivedPayment {
  return {
    id: `PAY-${date}`,
    amount,
    currency: "USD",
    status: "paid",
    date,
    dateLabel,
    invoiceNumbers,
    invoicesLabel: listed(invoiceNumbers),
    invoiceCount: invoiceNumbers.length,
    invoiceCountLabel: counted(invoiceNumbers.length, "invoice"),
  };
}

// "A", "A and B", "A, B and C".
function listed(items: readonly string[]) {
  const last = items.at(-1) ?? "";
  return items.length < 2
    ? last
    : `${items.slice(0, -1).join(", ")} and ${last}`;
}

// Your payments before these invoices, which no invoice here accounts for.
type History = Pick<
  FixtureData,
  "lastPayment" | "paidThisYear" | "paymentsReceived" | "bouncedPayment"
>;
const history: History = {
  lastPayment: {
    invoiceId: "INV-0131",
    amount: 4800,
    currency: "USD",
    status: "paid",
    date: "2026-10-10",
    dateLabel: "Oct 10",
  },
  paidThisYear: { amount: 41200, currency: "USD" },
  // This year's, newest first: the last payment, then the rest of the 41,200.
  paymentsReceived: [
    received(["2026-10-10", "Oct 10"], 4800, ["INV-0131"]),
    received(["2026-09-26", "Sep 26"], 6200, ["INV-0124", "INV-0127"]),
    received(["2026-09-12", "Sep 12"], 3900, ["INV-0119"]),
    received(["2026-08-29", "Aug 29"], 7350, [
      "INV-0109",
      "INV-0112",
      "INV-0115",
    ]),
    received(["2026-07-18", "Jul 18"], 9550, ["INV-0098", "INV-0103"]),
    received(["2026-06-06", "Jun 6"], 9400, [
      "INV-0084",
      "INV-0089",
      "INV-0091",
    ]),
  ],
  bouncedPayment: {
    id: "PAY-2026-10-17",
    invoiceId: "INV-0138",
    contractorId: you.id,
    contractor: you.name,
    amount: 3650,
    currency: "USD",
    status: "failed",
    date: "2026-10-17",
    dateLabel: "Oct 17",
    reason:
      "Your bank sent it back: the account number doesn't match the name on the account.",
  },
};

// The invoice invoice-review shows.
const reviewed = "INV-0148";

// The payments the Oct 10 run sent that came back, by the invoice each paid,
// with the bank's reason: INV-0146's, which is why that invoice is failed.
const bounces = [
  {
    invoiceId: "INV-0146",
    reason: "The bank closed the account.",
    date: "2026-10-13",
    dateLabel: "Oct 13",
  },
];

// The bounced payments whose invoice is in, each failed while its invoice
// is and scheduled once it's retried into the next run.
function failedPayments(allInvoices: readonly Invoice[]): FailedPayment[] {
  return bounces.flatMap(({ invoiceId, ...bounce }) => {
    const paid = allInvoices.find((each) => each.id === invoiceId);
    if (!paid) return [];
    return [
      {
        id: invoiceId.replace("INV-", "PAY-"),
        invoiceId,
        contractorId: paid.contractorId,
        contractor: paid.contractor,
        amount: paid.amount,
        currency: paid.currency,
        status: paid.status === "failed" ? "failed" : "scheduled",
        ...bounce,
      },
    ];
  });
}

// What the admin knows of each contractor beyond their invoices. Yours
// matches your history's total for the year.
type Profile = Omit<
  ContractorAccount,
  "openInvoices" | "openInvoicesLabel" | "owed"
>;
const profile = (
  { id, name }: Contractor,
  country: string,
  email: string,
  accountEnding: string,
  paidThisYear: number
): Profile => ({
  id,
  name,
  country,
  email,
  payoutMethod: `Bank transfer to an account ending ${accountEnding}`,
  paidThisYear,
  currency: "USD",
});
const profiles: readonly Profile[] = [
  profile(you, "Portugal", "ines@duarte.studio", "4417", 41200),
  profile(lea, "Germany", "lea.brandt@posteo.de", "0932", 28350),
  profile(tomas, "Mexico", "tomas@herrera.mx", "7781", 19800),
  profile(
    jonah,
    "United Kingdom",
    "jonah@whitfield-abernathy.co.uk",
    "2265",
    12460
  ),
  profile(priya, "India", "priya.raman@fastmail.com", "5108", 33915.5),
];

// Each contractor with their invoices here that aren't paid yet.
function accounts(allInvoices: readonly Invoice[]): ContractorAccount[] {
  return profiles.map((each) => {
    const open = allInvoices.filter(
      (invoice) => invoice.contractorId === each.id && invoice.status !== "paid"
    );
    return {
      ...each,
      openInvoices: open.length,
      openInvoicesLabel: counted(open.length, "invoice"),
      owed: open.reduce((sum, invoice) => sum + invoice.amount, 0),
    };
  });
}

// The runs before the next one, newest first; Oct 10's paid your last
// payment.
function pastRun(
  [date, dateLabel]: [string, string],
  contractors: number,
  [paidCount, paidAmount]: [number, number],
  [failedCount, failedAmount]: [number, number] = [0, 0]
): PastRun {
  const count = paidCount + failedCount;
  return {
    id: `run-${date}`,
    date,
    dateLabel,
    status: failedCount > 0 ? "failed" : "paid",
    count,
    countLabel: counted(count, "invoice"),
    amount: paidAmount + failedAmount,
    currency: "USD",
    contractorsLabel: counted(contractors, "contractor"),
    paidCountLabel: counted(paidCount, "invoice"),
    paidAmount,
    failedCountLabel: counted(failedCount, "invoice"),
    failedAmount,
  };
}
const pastRuns: readonly PastRun[] = [
  pastRun(["2026-10-10", "Oct 10"], 4, [5, 16420]),
  pastRun(["2026-09-26", "Sep 26"], 5, [5, 17485.5], [1, 1620]),
  pastRun(["2026-09-12", "Sep 12"], 3, [4, 11250]),
  pastRun(["2026-08-29", "Aug 29"], 5, [7, 21980]),
  pastRun(["2026-08-15", "Aug 15"], 3, [3, 8400]),
];

// The dataset of every contractor's invoices as a variant has them. Every
// view is read from them, so a variant that changes an invoice changes each
// screen that shows it alike.
function dataset(allInvoices: readonly Invoice[], past = history): FixtureData {
  const yours = allInvoices.filter((each) => each.contractorId === you.id);
  const next = yours.find((each) => each.status === "scheduled");
  const group = (status: InvoiceStatus): RunGroup | null => {
    const inGroup = allInvoices.filter((each) => each.status === status);
    if (inGroup.length === 0) return null;
    return {
      status,
      amount: inGroup.reduce((sum, each) => sum + each.amount, 0),
      currency: "USD",
      count: inGroup.length,
      countLabel: counted(inGroup.length, "invoice"),
    };
  };
  return {
    invoices: allInvoices,
    you,
    yourInvoices: yours,
    overdueInvoice: yours.find((each) => each.status === "overdue") ?? null,
    nextPayment: next
      ? {
          invoiceId: next.id,
          amount: next.amount,
          currency: next.currency,
          status: "scheduled",
          ...run,
        }
      : null,
    ...past,
    reviewInvoice: allInvoices.find((each) => each.id === reviewed) ?? null,
    paymentRun: {
      ...run,
      dueInRun: group("scheduled"),
      overdue: group("overdue"),
      awaitingApproval: group("awaiting"),
    },
    payQueue: allInvoices.filter((each) => toPay.has(each.id)),
    overdueInvoices: allInvoices.filter((each) => each.status === "overdue"),
    failedPayments: failedPayments(allInvoices),
    contractors: accounts(allInvoices),
    pastRuns,
  };
}

// The dataset once these invoices are scheduled into the next run.
function scheduled(ids: readonly string[]) {
  return dataset(
    invoices.map((each) =>
      ids.includes(each.id) ? { ...each, status: "scheduled" as const } : each
    )
  );
}

const shared = dataset(invoices);
// A contractor who hasn't invoiced yet: none of your invoices or payments.
const newContractor = dataset(
  invoices.filter((each) => each.contractorId !== you.id),
  {
    lastPayment: null,
    paidThisYear: null,
    paymentsReceived: [],
    bouncedPayment: null,
  }
);
// No contractor has an invoice in.
const noInvoices = dataset([]);
// The awaiting ones: what invoice-queue's rows-selected and payment-failed
// start with selected, and what its "3 invoices scheduled" schedules.
const awaiting = invoices
  .filter((each) => each.status === "awaiting")
  .map((each) => each.id);
// The overdue ones: what overdue-invoices' rows-selected and reminders-failed
// start with selected. Nothing is overdue once they're left out.
const overdue = shared.overdueInvoices.map((each) => each.id);
const nothingOverdue = dataset(
  invoices.filter((each) => each.status !== "overdue")
);
// The bounced payments: what failed-payments' rows-selected and retry-failed
// start with selected, and what its payments-retried schedules, with their
// invoices. None bounced once the failed invoices are left out.
const bounced = shared.failedPayments.map((each) => each.id);
const retried = scheduled(shared.failedPayments.map((each) => each.invoiceId));
const nothingBounced = dataset(
  invoices.filter((each) => each.status !== "failed")
);

// A variant is the data its screen state shows, the operations that fail
// under it, and the rows selected when it starts (ADR 0011). The selection
// sits outside the data, so no UI spec can bind it.
type Variant = {
  data: FixtureData;
  fails: readonly OperationName[];
  selected?: readonly string[];
};

const variants = {
  default: { data: shared, fails: [] },
  "payment-status/empty": { data: newContractor, fails: [] },
  "payment-status/reminder-sent": { data: shared, fails: [] },
  "payment-status/reminder-failed": { data: shared, fails: ["sendReminder"] },
  "payment-overview/empty": { data: newContractor, fails: [] },
  "invoice-queue/empty": { data: noInvoices, fails: [] },
  "invoice-queue/rows-selected": {
    data: shared,
    fails: [],
    selected: awaiting,
  },
  "invoice-queue/payment-scheduled": { data: scheduled(awaiting), fails: [] },
  "invoice-queue/payment-failed": {
    data: shared,
    fails: ["payInvoices"],
    selected: awaiting,
  },
  "invoice-review/payment-scheduled": {
    data: scheduled([reviewed]),
    fails: [],
  },
  "invoice-review/payment-failed": { data: shared, fails: ["payInvoices"] },
  "payment-run/empty": { data: noInvoices, fails: [] },
  "bulk-pay/empty": { data: noInvoices, fails: [] },
  "bulk-pay/rows-selected": { data: shared, fails: [], selected: awaiting },
  "bulk-pay/payment-scheduled": { data: scheduled(awaiting), fails: [] },
  "bulk-pay/payment-failed": {
    data: shared,
    fails: ["payInvoices"],
    selected: awaiting,
  },
  "overdue-invoices/empty": { data: nothingOverdue, fails: [] },
  "overdue-invoices/rows-selected": {
    data: shared,
    fails: [],
    selected: overdue,
  },
  "overdue-invoices/reminders-sent": { data: shared, fails: [] },
  "overdue-invoices/reminders-failed": {
    data: shared,
    fails: ["sendReminders"],
    selected: overdue,
  },
  "failed-payments/empty": { data: nothingBounced, fails: [] },
  "failed-payments/rows-selected": {
    data: shared,
    fails: [],
    selected: bounced,
  },
  "failed-payments/payments-retried": { data: retried, fails: [] },
  "failed-payments/retry-failed": {
    data: shared,
    fails: ["retryPayments"],
    selected: bounced,
  },
  // An account that has paid no one yet: no contractors, invoices or runs.
  "contractors/empty": {
    data: { ...noInvoices, contractors: [], pastRuns: [] },
    fails: [],
  },
  "run-history/empty": {
    data: { ...noInvoices, contractors: [], pastRuns: [] },
    fails: [],
  },
  "payments-received/empty": { data: newContractor, fails: [] },
  "payment-failed/retry-requested": { data: shared, fails: [] },
  "payment-failed/retry-failed": { data: shared, fails: ["requestRetry"] },
} satisfies Record<string, Variant>;

export type VariantName = keyof typeof variants;
export const variantNames = Object.keys(variants) as VariantName[];

export type Operations = {
  sendReminder: (invoiceId: string) => Promise<void>;
  payInvoices: (invoiceIds: readonly string[]) => Promise<void>;
  sendReminders: (invoiceIds: readonly string[]) => Promise<void>;
  retryPayments: (paymentIds: readonly string[]) => Promise<void>;
  // A bounced payment of yours, by its id.
  requestRetry: (paymentId: string) => Promise<void>;
};

export type FixtureVariant = {
  name: VariantName;
  data: FixtureData;
  // The mock operations as they settle under this variant.
  operations: Operations;
  // The ids of the rows selected when a screen starts in it.
  selected: readonly string[];
};

export function fixtureVariant(name: string): FixtureVariant {
  if (!isVariantName(name)) {
    throw new Error(
      `No fixture variant "${name}"; the variants are ${variantNames.join(", ")}.`
    );
  }
  const { data, fails, selected = [] }: Variant = variants[name];
  const failing = new Set<OperationName>(fails);
  const settle = (operation: OperationName, subject: string) =>
    new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (failing.has(operation)) {
          reject(
            new Error(
              `${operation}(${subject}) fails under the ${name} variant.`
            )
          );
        } else {
          resolve();
        }
      }, operationDelayMs);
    });
  return {
    name,
    data,
    selected,
    operations: {
      sendReminder: (invoiceId) => settle("sendReminder", invoiceId),
      payInvoices: (invoiceIds) => settle("payInvoices", invoiceIds.join(", ")),
      sendReminders: (invoiceIds) =>
        settle("sendReminders", invoiceIds.join(", ")),
      retryPayments: (paymentIds) =>
        settle("retryPayments", paymentIds.join(", ")),
      requestRetry: (paymentId) => settle("requestRetry", paymentId),
    },
  };
}

function isVariantName(name: string): name is VariantName {
  return Object.hasOwn(variants, name);
}
