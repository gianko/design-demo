// The fixture data's types: what useFixtureData() returns, and what gate 3
// checks a generated screen's reads against. The code step's prompt carries
// this file as written, so a screen knows which paths can be null.

export type InvoiceStatus =
  "awaiting" | "overdue" | "paid" | "scheduled" | "failed";

export type Contractor = { id: string; name: string };

export type Invoice = {
  id: string;
  number: string;
  // Who sent the invoice and is paid for it: the `Contractor.id` that says
  // whose it is, and the name a screen shows.
  contractorId: string;
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

// A payment a contractor's bank sent back: one in the admin's retry list, or
// your own bounced payment. It stays failed until it's retried into the next
// run, then it's scheduled, as its invoice is.
export type FailedPayment = {
  id: string;
  // The invoice it paid.
  invoiceId: string;
  contractorId: string;
  contractor: string;
  amount: number;
  currency: "USD";
  status: "failed" | "scheduled";
  // Why the bank sent it back.
  reason: string;
  // When it bounced.
  date: string;
  dateLabel: string;
};

// A payment you've received, and the invoices it paid.
export type ReceivedPayment = {
  id: string;
  amount: number;
  currency: "USD";
  status: "paid";
  date: string;
  dateLabel: string;
  // The invoices it paid, by number, and as one label: "INV-0124 and
  // INV-0127".
  invoiceNumbers: readonly string[];
  invoicesLabel: string;
  invoiceCount: number;
  invoiceCountLabel: string;
};

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
  // Your invoices, by number: empty for a contractor who hasn't invoiced yet.
  yourInvoices: readonly Invoice[];
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
  // The invoices the admin can pay in bulk: those awaiting approval, by
  // number. Once paid they stay here, scheduled.
  payQueue: readonly Invoice[];
  // Every contractor's overdue invoices, by number: the admin's reminders
  // list; empty when nothing is overdue.
  overdueInvoices: readonly Invoice[];
  // The payments contractors' banks sent back, by invoice: the admin's
  // retry list; empty when none bounced.
  failedPayments: readonly FailedPayment[];
  // Every contractor Northwind pays: empty when there are none.
  contractors: readonly ContractorAccount[];
  // The payment runs that have gone out, newest first: empty before the
  // first.
  pastRuns: readonly PastRun[];
  // The payments you've received this year, newest first: empty for a
  // contractor who hasn't been paid yet.
  paymentsReceived: readonly ReceivedPayment[];
  // Your one bounced payment, or null when there's none.
  bouncedPayment: FailedPayment | null;
};

// A contractor as the admin sees them: who they are, how they're paid, and
// what of theirs is still open.
export type ContractorAccount = {
  id: string;
  name: string;
  country: string;
  email: string;
  payoutMethod: string;
  // Their invoices not yet paid, whatever their status, and what those come
  // to.
  openInvoices: number;
  openInvoicesLabel: string;
  owed: number;
  // What they've been paid this year.
  paidThisYear: number;
  currency: "USD";
};

// A payment run that has gone out: failed when any payment in it bounced.
export type PastRun = {
  id: string;
  date: string;
  dateLabel: string;
  status: "paid" | "failed";
  // The invoices in it, and their total.
  count: number;
  countLabel: string;
  amount: number;
  currency: "USD";
  // Its breakdown: how many contractors it paid, then what went through and
  // what bounced, each a count and its total.
  contractorsLabel: string;
  paidCountLabel: string;
  paidAmount: number;
  failedCountLabel: string;
  failedAmount: number;
};
