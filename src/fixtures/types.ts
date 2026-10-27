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
  // Every contractor Northwind pays: empty when there are none.
  contractors: readonly ContractorAccount[];
  // The payment runs that have gone out, newest first: empty before the
  // first.
  pastRuns: readonly PastRun[];
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
