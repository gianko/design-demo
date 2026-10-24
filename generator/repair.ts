// The repair turn (ADR 0010): one failing attempt's hard-gate failures,
// normalised. Lines are grouped by gate, in gate order, and deduplicated by
// (rule, location); a render failure seen in several theme × screen state
// renders collapses into one line listing each. Each gate keeps at most 20
// lines and a `+N more` count. Each rule id gets one help line, and the turn
// ends by asking for the whole output again.

import type { Step } from "./config.ts";
import { type Failure, failureLine } from "./failure.ts";

export const linesPerGate = 20;

// The turn's own words. They steer the model as the prompts do, so each
// step's prompt hash covers them (prompts.ts).
export const repairWording = {
  intro:
    "The {output} you sent fails these gates. Each line is gate · rule id · location · message.",
  help: "What each rule checks:",
  ask: "Fix every failure above and {resend}",
  spec: { output: "UI spec", resend: "send the whole UI spec again." },
  code: {
    output: "TSX file",
    resend: "send the whole TSX file again, in one ```tsx block.",
  },
} as const;

export type RepairTurn = {
  // The failure lines as the turn sends them, `+N more` counts included.
  lines: string[];
  text: string;
};

export function repairTurn(step: Step, failures: Failure[]): RepairTurn {
  const groups = new Map<string, Failure[]>();
  const seen = new Map<string, Failure>();
  for (const failure of failures) {
    const key = identity(failure);
    const known = seen.get(key);
    if (known) {
      for (const render of failure.renders ?? []) {
        if (!known.renders!.includes(render)) known.renders!.push(render);
      }
      continue;
    }
    const copy = { ...failure, renders: [...(failure.renders ?? [])] };
    seen.set(key, copy);
    const group = groups.get(failure.gate) ?? [];
    group.push(copy);
    groups.set(failure.gate, group);
  }

  const lines: string[] = [];
  const sections: string[] = [];
  const help = new Map<string, string>();
  for (const [gate, group] of [...groups].sort(([a], [b]) =>
    a.localeCompare(b, "en", { numeric: true })
  )) {
    const shown = group.slice(0, linesPerGate);
    const gateLines = shown.map(failureLine);
    if (group.length > shown.length)
      gateLines.push(`${gate} · +${group.length - shown.length} more`);
    for (const failure of shown) {
      if (failure.help && !help.has(failure.rule))
        help.set(failure.rule, failure.help);
    }
    lines.push(...gateLines);
    sections.push([gate, ...gateLines].join("\n"));
  }

  const words = repairWording[step];
  const parts = [
    repairWording.intro.replace("{output}", words.output),
    ...sections,
  ];
  if (help.size) {
    parts.push(
      [
        repairWording.help,
        ...[...help].map(([rule, line]) => `${rule}: ${line}`),
      ].join("\n")
    );
  }
  parts.push(repairWording.ask.replace("{resend}", words.resend));
  return { lines, text: parts.join("\n\n") };
}

// Lines are told apart by (rule, location), as ADR 0010 has it. A location
// in parentheses names no place to point at: a script error's `(page)`, a
// failed build, a gate 1 failure on the whole UI spec, a tsc diagnostic with
// no file. Two of those differ only by message, so the message joins the key.
function identity({ gate, rule, location, message }: Failure) {
  const parts = [gate, rule, location];
  if (location.startsWith("(")) parts.push(message);
  return JSON.stringify(parts);
}
