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
  // Every contractor's overdue invoices, by number: the admin's reminders
  // list; empty when nothing is overdue.
  overdueInvoices: readonly Invoice[];
};
