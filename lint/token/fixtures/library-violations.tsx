// Planted as a library component. Each line below breaks one token-lint rule
// once; lint/token/token-lint.test.ts lists the findings it must produce.
import { tv } from "tailwind-variants/lite";

const button = tv({
  base: "h-control rounded-control bg-accent",
  variants: {
    // An arbitrary value behind a variant, inside a tv() variant.
    tone: { quiet: "hover:bg-[#fff]" },
    // Wrapping a component sets itself, which base CSS sets once.
    wrap: { balanced: "text-balance" },
  },
});

export function Violations({ size }: { size: string }) {
  return (
    <section className={button({ tone: "quiet" })}>
      {/* A colour role outside its own namespace, once per namespace. */}
      <p className="bg-ink">Background</p>
      <p className="text-surface">Text</p>
      <p className="border-ink">Border</p>
      <p className="ring-line">Ring</p>
      {/* Values that compile but come from no token. */}
      <p className="[color:#f00]">Arbitrary property</p>
      <p className="p-(--gutter)!">Variable shorthand</p>
      <p className="data-[state=open]:-z-10">Bare number</p>
      <p className="h-px">Bare pixel</p>
      <p className="bg-accent/50">Alpha modifier</p>
      <p className="opacity-0">Opacity</p>
      <p className="text-pretty">Pretty wrapping</p>
      <p className={`gap-${size}`}>Concatenated</p>
      {/* Values set outside classes. */}
      <p style={{ color: "var(--ds-color-text-ink)" }}>Inline style</p>
      <svg viewBox="0 0 16 16" aria-hidden>
        <linearGradient id="fade">
          <stop stopColor="plum" />
        </linearGradient>
        <path fill={"#ff0000"} d="M0 0h16v16H0z" />
      </svg>
    </section>
  );
}
