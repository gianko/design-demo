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

// A payment to you that your bank sent back.
export type BouncedPayment = {
  id: string;
  // The invoice it was paying.
  invoiceNumber: string;
  amount: number;
  currency: "USD";
  status: "failed";
  // When it bounced.
  date: string;
  dateLabel: string;
  // Why it bounced, in a sentence you can act on.
  reason: string;
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
  // The payments you've received this year, newest first: empty for a
  // contractor who hasn't been paid yet.
  paymentsReceived: readonly ReceivedPayment[];
  // Your one bounced payment, or null when there's none.
  bouncedPayment: BouncedPayment | null;
};
