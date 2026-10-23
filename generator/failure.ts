// One gate failure as the repair turn will send it (ADR 0010):
// `gate · rule id · location · message`. A render-time failure also lists the
// renders it occurs in, each as `<theme> · <screen state>`.
export type Failure = {
  gate: string;
  rule: string;
  location: string;
  message: string;
  renders?: string[];
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
