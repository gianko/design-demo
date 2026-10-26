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

export type InvoiceStatus =
  "awaiting" | "overdue" | "paid" | "scheduled" | "failed";

export type Contractor = { id: string; name: string };

export type Invoice = {
  id: string;
  number: string;
  // Who sent the invoice and is paid for it.
  contractor: string;
  // Who pays it: Northwind, for every invoice.
  client: string;
  // In the currency's major unit: 4800 is 4,800.00.
  amount: number;
  currency: "USD";
  status: InvoiceStatus;
  // Every date carries its display label beside the ISO value, and every
  // count its label beside the number; a UI spec binds the label.
  dueDate: string;
  dueLabel: string;
  lineCount: number;
  lineCountLabel: string;
};

export type Payment = {
  invoiceId: string;
  amount: number;
  currency: "USD";
  status: "scheduled" | "paid";
  // When it arrives, or arrived.
  date: string;
  dateLabel: string;
};

export type Total = { amount: number; currency: "USD" };

// One status's share of a payment run.
export type RunGroup = {
  status: InvoiceStatus;
  amount: number;
  currency: "USD";
  count: number;
  countLabel: string;
};

export type PaymentRun = {
  date: string;
  dateLabel: string;
  // Each null when no invoice is in it.
  dueInRun: RunGroup | null;
  overdue: RunGroup | null;
  awaitingApproval: RunGroup | null;
};

export type FixtureData = {
  // Every contractor's invoices: the admin's queue.
  invoices: readonly Invoice[];
  // The contractor the contractor screens are for.
  you: Contractor;
  // Your one overdue invoice, or null when there's none.
  overdueInvoice: Invoice | null;
  // Your payment in the next run, your latest paid one, and what you've been
  // paid this year; each null when there's none.
  nextPayment: Payment | null;
  lastPayment: Payment | null;
  paidThisYear: Total | null;
  // The one invoice the admin reviews, or null when there's none.
  reviewInvoice: Invoice | null;
  // The next payment run, totalled by status.
  paymentRun: PaymentRun;
};

export const operationNames = ["sendReminder", "payInvoices"] as const;
export type OperationName = (typeof operationNames)[number];

// Long enough for a Button's progress edge to fill and sweep once.
export const operationDelayMs = 1800;

const you: Contractor = { id: "ines-duarte", name: "Ines Duarte" };
// Long on purpose, for the text-overflow taste rule.
const northwind = "Northwind Logistics & Freight Holdings Ltd.";
const run = { date: "2026-10-24", dateLabel: "Oct 24" };

function invoice(
  number: string,
  contractor: string,
  amount: number,
  status: InvoiceStatus,
  [dueDate, dueLabel]: [string, string],
  lineCount: number
): Invoice {
  return {
    id: number,
    number,
    contractor,
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
  invoice("INV-0142", you.name, 4800, "overdue", ["2026-10-08", "Oct 8"], 2),
  invoice(
    "INV-0144",
    "Lea Brandt",
    3100,
    "overdue",
    ["2026-10-12", "Oct 12"],
    3
  ),
  invoice(
    "INV-0145",
    "Tomás Herrera",
    2750,
    "scheduled",
    ["2026-10-21", "Oct 21"],
    1
  ),
  invoice(
    "INV-0146",
    "Jonah Whitfield-Abernathy",
    1620,
    "failed",
    ["2026-10-15", "Oct 15"],
    2
  ),
  invoice(
    "INV-0147",
    "Tomás Herrera",
    1250,
    "awaiting",
    ["2026-10-30", "Oct 30"],
    1
  ),
  invoice(
    "INV-0148",
    "Priya Raman",
    6375.5,
    "awaiting",
    ["2026-11-02", "Nov 2"],
    4
  ),
  invoice(
    "INV-0149",
    "Jonah Whitfield-Abernathy",
    980,
    "awaiting",
    ["2026-11-05", "Nov 5"],
    2
  ),
  invoice("INV-0151", you.name, 2400, "scheduled", ["2026-10-22", "Oct 22"], 1),
];

// Your payments before these invoices, which no invoice here accounts for.
type History = Pick<FixtureData, "lastPayment" | "paidThisYear">;
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
};

// The invoice invoice-review shows.
const reviewed = "INV-0148";

// The dataset over these invoices. Every view is read from them, so a variant
// that changes an invoice changes each screen that shows it alike.
function dataset(over: readonly Invoice[], past = history): FixtureData {
  const yours = over.filter((each) => each.contractor === you.name);
  const next = yours.find((each) => each.status === "scheduled");
  const group = (status: InvoiceStatus): RunGroup | null => {
    const inGroup = over.filter((each) => each.status === status);
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
    invoices: over,
    you,
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
    reviewInvoice: over.find((each) => each.id === reviewed) ?? null,
    paymentRun: {
      ...run,
      dueInRun: group("scheduled"),
      overdue: group("overdue"),
      awaitingApproval: group("awaiting"),
    },
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
  invoices.filter((each) => each.contractor !== you.name),
  { lastPayment: null, paidThisYear: null }
);
// No contractor has an invoice in.
const noInvoices = dataset([]);
// The awaiting ones, which invoice-queue's "3 invoices scheduled" selects.
const awaiting = invoices
  .filter((each) => each.status === "awaiting")
  .map((each) => each.id);

const variants = {
  default: { data: shared, fails: [] },
  "payment-status/empty": { data: newContractor, fails: [] },
  "payment-status/reminder-sent": { data: shared, fails: [] },
  "payment-status/reminder-failed": { data: shared, fails: ["sendReminder"] },
  "payment-overview/empty": { data: newContractor, fails: [] },
  "invoice-queue/empty": { data: noInvoices, fails: [] },
  "invoice-queue/rows-selected": { data: shared, fails: [] },
  "invoice-queue/payment-scheduled": { data: scheduled(awaiting), fails: [] },
  "invoice-queue/payment-failed": { data: shared, fails: ["payInvoices"] },
  "invoice-review/payment-scheduled": {
    data: scheduled([reviewed]),
    fails: [],
  },
  "invoice-review/payment-failed": { data: shared, fails: ["payInvoices"] },
  "payment-run/empty": { data: noInvoices, fails: [] },
} satisfies Record<
  string,
  { data: FixtureData; fails: readonly OperationName[] }
>;

export type VariantName = keyof typeof variants;
export const variantNames = Object.keys(variants) as VariantName[];

export type Operations = {
  sendReminder: (invoiceId: string) => Promise<void>;
  payInvoices: (invoiceIds: readonly string[]) => Promise<void>;
};

export type FixtureVariant = {
  name: VariantName;
  data: FixtureData;
  // The mock operations as they settle under this variant.
  operations: Operations;
};

export function fixtureVariant(name: string): FixtureVariant {
  if (!isVariantName(name)) {
    throw new Error(
      `No fixture variant "${name}"; the variants are ${variantNames.join(", ")}.`
    );
  }
  const { data, fails } = variants[name];
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
    operations: {
      sendReminder: (invoiceId) => settle("sendReminder", invoiceId),
      payInvoices: (invoiceIds) => settle("payInvoices", invoiceIds.join(", ")),
    },
  };
}

function isVariantName(name: string): name is VariantName {
  return Object.hasOwn(variants, name);
}
