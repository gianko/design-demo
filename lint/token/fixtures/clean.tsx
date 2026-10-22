// Planted as a library component. Everything here is drawn from a token, so
// token lint finds nothing.
import { tv } from "tailwind-variants/lite";

const card = tv({
  slots: {
    root: "flex flex-col gap-sm rounded-surface border border-line bg-surface p-page shadow-raised",
    title: "text-heading text-ink",
    action:
      "h-control rounded-control bg-accent px-control text-label text-on-accent hover:bg-accent-hover focus-visible:focus-ring transition-colors duration-fast ease-standard",
  },
});

export function Clean() {
  const { root, title, action } = card();
  return (
    <section className={root()}>
      {/* One role per colour namespace: background, text, border and ring. */}
      <p className="bg-overdue text-overdue border-control ring-focus">
        Overdue
      </p>
      <h2 className={title()}>Invoices</h2>
      <svg className="size-icon" viewBox="0 0 16 16" aria-hidden>
        <path fill="currentColor" stroke="none" d="M0 0h16v16H0z" />
        <path fill="url(#edge)" d="M0 0h16v2H0z" />
      </svg>
      <button className={`${action()} data-[state=open]:bg-selected z-raised`}>
        Send reminder
      </button>
      <div className="min-w-0 shrink-0 flex-1 grid grid-cols-2 col-span-2 w-1/2 p-0" />
    </section>
  );
}
