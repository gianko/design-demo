// `pnpm evals:readme`: the README's eval table, rewritten from the newest
// results file. Each test writes its own results files, screen briefs and
// README; the last one checks the real README against the committed results
// files.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { main, rewrittenReadme } from "./readme.ts";
import {
  type At,
  gate5,
  judged,
  runA,
  runB,
  setup,
  write,
} from "./report-fixtures.ts";
import { repo } from "../repo.ts";

const start =
  "<!-- eval-table:start: written by `pnpm evals:readme` from the newest results file -->";
const end = "<!-- eval-table:end -->";

// A README with the markers in at.dir, beside screen briefs for the
// fixtures' two slugs under briefs/.
function readme(at: At) {
  mkdirSync(join(at.dir, "briefs"), { recursive: true });
  for (const [slug, audience] of [
    ["invoice-queue", "admin"],
    ["payment-status", "contractor"],
  ])
    writeFileSync(
      join(at.dir, "briefs", `${slug}.md`),
      `---\naudience: ${audience}\nrequires:\n  components: [Screen]\n---\n\n# ${slug}\n`
    );
  const path = join(at.dir, "README.md");
  writeFileSync(
    path,
    `# Title\n\n## Results\n\n${start}\nA stale table.\n${end}\n\nAfter the table.\n`
  );
  return path;
}

async function run(at: At, readmePath: string) {
  const lines: string[] = [];
  const code = await main([], {
    log: (line) => lines.push(line),
    readmePath,
    resultsDir: at.resultsDir,
    briefsDir: join(at.dir, "briefs"),
  });
  return { code, output: lines.join("\n") };
}

describe("pnpm evals:readme", () => {
  it("writes the newest run's table between the markers and leaves the rest alone", async () => {
    const at = setup();
    write(at, "2026-10-26-before.json", runA(at));
    write(at, "2026-10-27-after.json", {
      ...runA(at),
      runId: "20261027-090000-after",
      startedAt: "2026-10-27T08:00:00.000Z",
      versions: { ...runA(at).versions, gitSha: "b".repeat(40) },
      baseline: "2026-10-26-before",
    });
    const path = readme(at);

    const { code, output } = await run(at, path);

    expect(code).toBe(0);
    expect(readFileSync(path, "utf8")).toBe(
      `# Title\n\n## Results\n\n${start}\n\n` +
        "2 screen briefs, K = 3, Opus 5.5, on a clean tree at `bbbbbbb` ([results file](results/2026-10-27-after.json)). The [report](https://gianko.github.io/design-demo/evals/) compares it against [2026-10-26-before](results/2026-10-26-before.json).\n\n" +
        "| Screen brief | Audience | Passed | First attempt | Cost |\n" +
        "|---|---|---|---|---|\n" +
        "| [invoice-queue](briefs/invoice-queue.md) | admin | 2 / 3 | 1 / 3 | $0.90 |\n" +
        "| [payment-status](briefs/payment-status.md) | contractor | 3 / 3 | 2 / 3 | $0.70 |\n" +
        "| **All** | | **5 / 6** | **3 / 6** | **$1.60** |\n\n" +
        `${end}\n\nAfter the table.\n`
    );
    expect(output).toContain("README.md: the eval table from 2026-10-27-after");
  });

  it("says a dirty tree, and how many reps errored or were skipped", async () => {
    const at = setup();
    const file = runB(at);
    file.versions.dirty = true;
    file.totals.error = 1;
    file.totals.skipped = 2;
    write(at, "2026-10-27-after.json", file);
    const path = readme(at);

    expect((await run(at, path)).code).toBe(0);

    const text = readFileSync(path, "utf8");
    expect(text).toContain(
      "on a dirty tree at `aaaaaaa` ([results file](results/2026-10-27-after.json), [report](https://gianko.github.io/design-demo/evals/))."
    );
    expect(text).toContain(
      "1 rep errored and 2 were skipped; the pass rates leave them out."
    );
  });

  it("says how much of each cost is gate 5's, for a run with gate 5", async () => {
    const at = setup();
    write(
      at,
      "2026-10-27-after.json",
      judged(runA(at), () => gate5({ default: [] }))
    );
    const path = readme(at);

    expect((await run(at, path)).code).toBe(0);

    const text = readFileSync(path, "utf8");
    expect(text).toContain(
      "| [invoice-queue](briefs/invoice-queue.md) | admin | 2 / 3 | 1 / 3 | $1.05, of which gate 5 $0.15 |"
    );
    expect(text).toContain(
      "| **All** | | **5 / 6** | **3 / 6** | **$1.90, of which gate 5 $0.30** |"
    );
  });

  it("fails without touching the README when its markers are missing", async () => {
    const at = setup();
    write(at, "2026-10-27-after.json", runB(at));
    const path = readme(at);
    writeFileSync(path, "# Title\n");

    const { code, output } = await run(at, path);

    expect(code).toBe(1);
    expect(output).toContain(start);
    expect(readFileSync(path, "utf8")).toBe("# Title\n");
  });

  it("fails when there's no results file", async () => {
    const at = setup();
    const path = readme(at);

    const { code, output } = await run(at, path);

    expect(code).toBe(1);
    expect(output).toContain("No results file");
  });
});

describe("README.md", () => {
  it("has the eval table pnpm evals:readme writes from the newest results file", () => {
    const text = readFileSync(join(repo, "README.md"), "utf8");
    expect(
      text,
      "README.md's eval table is stale: run `pnpm evals:readme`"
    ).toBe(rewrittenReadme(text));
  });
});
