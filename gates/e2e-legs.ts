// How the Gate e2e workflow splits `pnpm test:gate` over runners. GATE_E2E_LEG
// names one leg: `<n>/<count>` is a share of the fixture targets that
// gate.e2e.ts renders in CI, and `rest` is everything else. With no leg, as on
// the Mac, a run covers everything.

export type Leg =
  | { kind: "all" }
  | { kind: "rest" }
  | { kind: "share"; index: number; count: number };

export function parseLeg(value: string | undefined): Leg {
  if (!value) return { kind: "all" };
  if (value === "rest") return { kind: "rest" };
  const [, index, count] = /^(\d+)\/(\d+)$/.exec(value)?.map(Number) ?? [];
  // A typo must not pass by running nothing.
  if (!index || !count || index > count) {
    throw new Error(`GATE_E2E_LEG is "rest" or "<n>/<count>", not "${value}".`);
  }
  return { kind: "share", index, count };
}

// The targets a leg renders: dealt out in turn, so a new fixture lands in a
// share by itself.
export function targetsOf(leg: Leg, targets: string[]): string[] {
  if (leg.kind === "all") return targets;
  if (leg.kind === "rest") return [];
  return targets.filter((_, i) => i % leg.count === leg.index - 1);
}

// Whether a leg renders a story, from the story's id, whose title part is its
// target in lower case. A story no leg would render is an error, or its check
// would be skipped in all of them.
export function rendersStory(
  leg: Leg,
  targets: string[],
  storyId: string
): boolean {
  const title = storyId.split("--")[0]!.split("-").slice(1).join("-");
  const target = targets.find((name) => name.toLowerCase() === title);
  if (!target) throw new Error(`No fixture target renders ${storyId}.`);
  return targetsOf(leg, targets).includes(target);
}
