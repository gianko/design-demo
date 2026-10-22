// What the Playwright pass may do to baselines, as Playwright's
// --update-snapshots names it (ADR 0006, ADR 0009). Outside CI a missing
// baseline is written, for the human to approve from the contact sheet. In CI
// it fails. `--update` also rewrites a baseline that differs, and only the
// human runs it.

export type BaselineMode = "missing" | "none" | "changed";

export function baselineMode({
  update,
  ci,
}: {
  update: boolean;
  ci: boolean;
}): BaselineMode {
  if (update && ci) {
    throw new Error(
      "--update rewrites baselines, and no workflow does that (ADR 0009)."
    );
  }
  if (update) return "changed";
  return ci ? "none" : "missing";
}
