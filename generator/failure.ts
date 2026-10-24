// The gates a rep runs, named as an attempt records their results and as its
// failure lines name them. Gate 7 runs twice, statically in ESLint and on
// each render, so each half has its own name.
export type GateName =
  "gate 1" | "gate 2" | "gate 3" | "gate 4" | "gate 7 static" | "gate 7 render";

// One gate failure as the repair turn will send it (ADR 0010):
// `gate · rule id · location · message`. A render-time failure also lists the
// renders it occurs in, each as `<theme> · <screen state>`. `help` is the
// rule's one help line, where the gate has one: ESLint's
// `meta.docs.description`, axe's `help`, a taste rule's line in
// lint/taste/RULES.md.
export type Failure = {
  gate: GateName;
  rule: string;
  location: string;
  message: string;
  renders?: string[];
  help?: string;
};

export function failureLine({
  gate,
  rule,
  location,
  message,
  renders,
}: Failure) {
  const line = `${gate} · ${rule} · ${location} · ${message}`;
  return renders?.length ? `${line} (in ${renders.join(", ")})` : line;
}
