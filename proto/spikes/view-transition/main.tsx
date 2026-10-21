// PROTOTYPE spike: can the View Transitions API carry row → invoice-detail sheet
// with a Radix Dialog, CSS only, no inline style? Plain elements: this is not library code.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import "./spike.css";

const invoices = [
  { id: "INV-1042", who: "Ana Ribeiro", amount: "4,800.00 USD", status: "Overdue" },
  { id: "INV-1043", who: "Kofi Mensah", amount: "1,250.00 EUR", status: "Awaiting" },
  { id: "INV-1044", who: "Mei Tanaka", amount: "3,100.00 USD", status: "Paid" },
];

const log = (m: string) => { (window as unknown as { vtLog: string[] }).vtLog ??= []; (window as unknown as { vtLog: string[] }).vtLog.push(m); };

function transition(kind: "open" | "close", update: () => void) {
  if (!document.startViewTransition) { log("no-vt-api"); update(); return; }
  document.documentElement.dataset.vt = kind;
  const t = document.startViewTransition(() => flushSync(update));
  t.ready.then(() => log(`${kind}:ready`)).catch((e) => log(`${kind}:ready-error:${e}`));
  t.finished.then(() => { log(`${kind}:finished`); delete document.documentElement.dataset.vt; });
}

function App() {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const inv = invoices.find((i) => i.id === active);

  const openRow = (id: string) => { flushSync(() => setActive(id)); transition("open", () => setOpen(true)); };
  const onOpenChange = (next: boolean) => { if (!next) transition("close", () => setOpen(false)); };

  return (
    <main className="p-page bg-page text-ink text-body">
      <h1 className="text-title pb-sm">Invoices</h1>
      <div className="bg-surface border border-line rounded-surface">
        {invoices.map((i) => (
          <button
            key={i.id}
            data-testid={`row-${i.id}`}
            onClick={() => openRow(i.id)}
            className={`flex w-full items-center justify-between h-row px-sm border-b border-line text-body text-ink bg-surface focus-visible:focus-ring ${active === i.id && !open ? "vt-invoice" : ""}`}
          >
            <span>{i.who}</span><span>{i.id}</span><span>{i.amount}</span><span className="text-ink-muted">{i.status}</span>
          </button>
        ))}
      </div>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="vt-scrim fixed inset-0 bg-scrim z-overlay" />
          <Dialog.Content
            onCloseAutoFocus={(e) => { e.preventDefault(); document.querySelector<HTMLElement>(`[data-testid=row-${active}]`)?.focus(); }}
            data-testid="sheet"
            className="vt-invoice fixed top-0 right-0 bottom-0 w-sheet z-overlay bg-surface-raised shadow-overlay p-lg flex flex-col gap-sm"
          >
            <Dialog.Title className="text-title">{inv?.who}</Dialog.Title>
            <Dialog.Description className="text-ink-muted">{inv?.id} · {inv?.status}</Dialog.Description>
            <p className="text-figure">{inv?.amount}</p>
            <Dialog.Close className="h-row px-sm rounded-control bg-accent text-on-accent text-label focus-visible:focus-ring">Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
