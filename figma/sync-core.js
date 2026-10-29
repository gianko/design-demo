// What every figma:sync-* runtime shares (ADR 0007): the checksum guard over
// the script's own data, the dry run, and the apply that diffs the file again
// inside the same call. Each runtime adds one pass that diffs its payload
// against the file and writes what differs unless the run is dry.

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// Figma stores floats as float32; 1e-4 is well clear of the round trip.
function same(a, b) {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-4;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => same(item, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = Object.keys(a).sort();
    return (
      keys.join("\n") === Object.keys(b).sort().join("\n") &&
      keys.every((key) => same(a[key], b[key]))
    );
  }
  return a === b;
}

// sync-runtime.js uses it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sameSet = (a, b) => same([...a].sort(), [...b].sort());

// The runtimes after this one call it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function runSync(command, RUN, PAYLOAD, CHECKSUM, pass) {
  // The agent re-types this script into use_figma, so it guards its own data.
  const actual = fnv1a(JSON.stringify([RUN, PAYLOAD]));
  if (actual !== CHECKSUM) {
    throw new Error(
      `${command}: checksum mismatch, the data hashes to ${actual}, not ${CHECKSUM}. The script changed on its way here, so nothing was written; pass the generated file verbatim.`
    );
  }
  const report = await pass(RUN, PAYLOAD);
  if (RUN.dryRun) return report;

  // An apply diffs the file again, so its own report proves the sync landed
  // and no confirming dry run is needed. A difference throws, and use_figma
  // rolls the whole call back.
  const check = await pass({ dryRun: true, prune: [] }, PAYLOAD);
  if (check.counts.changes) {
    throw new Error(
      `${command}: after writing, ${[...check.created, ...check.updated].join(", ")} still differs, so nothing was kept.`
    );
  }
  report.remaining = check.counts;
  return report;
}
