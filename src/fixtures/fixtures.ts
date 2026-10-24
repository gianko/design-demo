// The fixtures (ADR 0004): the one fixed, typed set of sample data every
// generated screen renders, in named variants that a UI spec's screen states
// point at, and the mock async operations its actions run. Each operation
// settles after a fixed delay and fails only when the active variant says so,
// so every rep, baseline and capture sees the same thing.

export type InvoiceStatus =
  "awaiting" | "overdue" | "paid" | "scheduled" | "failed";

export type Invoice = {
  id: string;
  number: string;
  client: string;
  // In the currency's major unit: 4800 is 4,800.00.
  amount: number;
  currency: "USD";
  status: InvoiceStatus;
  // Every date carries its display label beside the ISO value; a UI spec
  // binds the label.
  dueDate: string;
  dueLabel: string;
};

export type FixtureData = {
  invoices: readonly Invoice[];
  // The contractor's one overdue invoice, or null when there's none.
  overdueInvoice: Invoice | null;
};

export const operationNames = ["sendReminder"] as const;
export type OperationName = (typeof operationNames)[number];

// Long enough for a Button's progress edge to fill and sweep once.
export const operationDelayMs = 1800;

const inv0142: Invoice = {
  id: "INV-0142",
  number: "INV-0142",
  // Long on purpose, for the text-overflow taste rule.
  client: "Northwind Logistics & Freight Holdings Ltd.",
  amount: 4800,
  currency: "USD",
  status: "overdue",
  dueDate: "2026-10-08",
  dueLabel: "Oct 8",
};

const withInvoice: FixtureData = {
  invoices: [inv0142],
  overdueInvoice: inv0142,
};

const variants = {
  default: { data: withInvoice, fails: [] },
  "payment-status/empty": {
    data: { invoices: [], overdueInvoice: null },
    fails: [],
  },
  "payment-status/reminder-sent": { data: withInvoice, fails: [] },
  "payment-status/reminder-failed": {
    data: withInvoice,
    fails: ["sendReminder"],
  },
} satisfies Record<
  string,
  { data: FixtureData; fails: readonly OperationName[] }
>;

export type VariantName = keyof typeof variants;
export const variantNames = Object.keys(variants) as VariantName[];

export type Operations = { sendReminder: (invoiceId: string) => Promise<void> };

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
    },
  };
}

function isVariantName(name: string): name is VariantName {
  return Object.hasOwn(variants, name);
}
