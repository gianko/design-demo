// One gate failure as the repair turn will send it (ADR 0010):
// `gate · rule id · location · message`.
export type Failure = {
  gate: string;
  rule: string;
  location: string;
  message: string;
};

export function failureLine({ gate, rule, location, message }: Failure) {
  return `${gate} · ${rule} · ${location} · ${message}`;
}
