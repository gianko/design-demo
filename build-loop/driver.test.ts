import { describe, expect, test } from "vitest";
import { type Build, drive, type Issue, type Ports } from "./driver.ts";

describe("drive --dry-run", () => {
  test("prints the first open, unblocked build-loop issue and writes nothing", () => {
    const world = fakeWorld([
      issue(61, "Build component: Stack", { openBlockers: 1 }),
      issue(54, "Build component: Text"),
      issue(62, "Build component: Heading"),
    ]);

    drive(world.ports, { dryRun: true });

    expect(world.log).toEqual([
      "Would take #54 Build component: Text (/build-component Text)",
    ]);
    expect(world.writes).toEqual([]);
  });
});

describe("drive", () => {
  test("stops without building when every build-loop issue is blocked or taken", () => {
    const world = fakeWorld([
      issue(61, "Build component: Stack", { openBlockers: 1 }),
      issue(54, "Build component: Text", { assignees: ["gianko"] }),
    ]);

    drive(world.ports, { dryRun: false });

    expect(world.log).toEqual(["No build-loop issue is unblocked."]);
    expect(world.writes).toEqual([]);
  });

  test("claims the issue, builds its component, and opens a PR that closes it", () => {
    const world = fakeWorld([
      issue(54, "Build component: Text"),
      issue(61, "Build component: Stack", { openBlockers: 1 }),
    ]);

    drive(world.ports, { dryRun: false });

    expect(world.writes).toEqual([
      "claim #54",
      "build Text",
      "push build-component-text",
      "pr build-component-text: Build component: Text",
    ]);
    const [pr] = world.pullRequests;
    expect(pr!.body).toMatch(/^Closes #54\n/);
    expect(pr!.body).toContain("success: 39 turns, 3 min, ~$1.05 (estimate)");
    expect(pr!.body).toContain(
      "[contact sheet](https://github.com/gianko/design-demo/actions/workflows/ci.yml?query=branch%3Abuild-component-text)"
    );
    // Text is now taken and Stack is still blocked, so the next iteration stops.
    expect(world.log.at(-1)).toBe("No build-loop issue is unblocked.");
  });

  test("files each GAPS.md entry as a needs-triage issue that blocks the next build-loop issue", () => {
    // Heading is listed before Stack, but Stack is next in build order.
    const world = fakeWorld(
      [
        issue(54, "Build component: Text"),
        issue(62, "Build component: Heading", { openBlockers: 1 }),
        issue(61, "Build component: Stack", { openBlockers: 1 }),
      ],
      { Text: { gaps: textGaps } }
    );

    drive(world.ports, { dryRun: false });

    expect(world.writes).toEqual([
      "claim #54",
      "build Text",
      "push build-component-text",
      "triage Text gap: No prose width",
      "block #61 by #201",
      "triage Text gap: Muted text on tinted surfaces",
      "block #61 by #202",
      "pr build-component-text: Build component: Text",
    ]);
    const [first, second] = world.triageIssues;
    expect(first!.body).toContain(
      "**Call:** no max-width; Screen leaves it to Text."
    );
    expect(first!.body).toContain("#54");
    expect(second!.body).toContain("### Where it shows");
    expect(world.pullRequests[0]!.body).toContain(
      "Filed as `needs-triage`, each blocking #61: #201, #202"
    );
  });
});

describe("drive, over several iterations", () => {
  test("builds each unblocked issue in turn, and blocks only an issue not yet taken", () => {
    // Text's PR hasn't merged, so #54 is still open when Stack's gaps are
    // filed.
    const world = fakeWorld(
      [
        issue(54, "Build component: Text"),
        issue(61, "Build component: Stack"),
        issue(62, "Build component: Heading", { openBlockers: 1 }),
      ],
      { Stack: { gaps: textGaps } }
    );

    drive(world.ports, { dryRun: false });

    expect(
      world.writes.filter((write) => /^(build|block)/.test(write))
    ).toEqual([
      "build Text",
      "build Stack",
      "block #62 by #201",
      "block #62 by #202",
    ]);
    expect(world.log.at(-1)).toBe("No build-loop issue is unblocked.");
  });
});

describe("drive, when a session fails", () => {
  test("stops with the issue claimed and nothing pushed, filed or opened", () => {
    const world = fakeWorld(
      [issue(54, "Build component: Text"), issue(61, "Build component: Stack")],
      { Text: { ok: false, gaps: textGaps } }
    );

    expect(() => drive(world.ports, { dryRun: false })).toThrow(
      "The /build-component Text session for #54 failed; its work is left in /repo/.claude/worktrees/build-component-text."
    );
    expect(world.writes).toEqual(["claim #54", "build Text"]);
  });

  test("stops before pushing, filing or opening when GAPS.md has content but no `## ` entries", () => {
    // Gaps written one heading level too deep: a narrow parse finds none and
    // reports the session as gap-free.
    const world = fakeWorld([issue(54, "Build component: Text")], {
      Text: { gaps: textGaps.replaceAll(/^## /gm, "### ") },
    });

    expect(() => drive(world.ports, { dryRun: false })).toThrow(
      "src/components/Text/GAPS.md for #54 has content but no `## ` gap entries; its work is left in /repo/.claude/worktrees/build-component-text."
    );
    expect(world.writes).toEqual(["claim #54", "build Text"]);
  });

  test("refuses an issue whose title names no component", () => {
    const world = fakeWorld([issue(54, "Build Text")]);

    expect(() => drive(world.ports, { dryRun: true })).toThrow(
      '#54 "Build Text" doesn\'t name a component as "Build component: <Name>".'
    );
  });

  // `/build-component text` would make a `text` folder no gate or lint
  // treats as a component.
  test("refuses a component name that isn't PascalCase", () => {
    const world = fakeWorld([issue(54, "Build component: text")]);

    expect(() => drive(world.ports, { dryRun: true })).toThrow(
      '#54 "Build component: text" doesn\'t name a component as "Build component: <Name>".'
    );
  });
});

const textGaps = `# Text: gaps

Each entry is one place the brief didn't decide something.

## 1. No prose width

**Undecided:** the brief sets no line length.

**Call:** no max-width; Screen leaves it to Text.

## 2. Muted text on tinted surfaces

**Undecided:** contrast of \`text-ink-muted\` on \`bg-tint\`.

### Where it shows

The Muted story in dark.
`;

function issue(
  number: number,
  title: string,
  {
    openBlockers = 0,
    assignees = [],
  }: { openBlockers?: number; assignees?: string[] } = {}
): Issue {
  return { number, title, openBlockers, assignees };
}

// An in-memory GitHub and session that keep the state the real ones would: a
// claim assigns the issue, and a blocking edge counts against the blocked
// issue. Every write, to either, lands in one log, in order.
function fakeWorld(
  issues: Issue[],
  sessions: Partial<Record<string, Partial<Build>>> = {}
) {
  const writes: string[] = [];
  const log: string[] = [];
  const pullRequests: { branch: string; title: string; body: string }[] = [];
  const triageIssues: { title: string; body: string }[] = [];
  const find = (number: number) => {
    const found = issues.find((each) => each.number === number);
    if (!found) throw new Error(`No issue #${number}`);
    return found;
  };
  const ports: Ports = {
    tracker: {
      repo: "gianko/design-demo",
      buildLoopIssues: () =>
        issues.map((each) => ({ ...each, assignees: [...each.assignees] })),
      claim(number) {
        writes.push(`claim #${number}`);
        find(number).assignees.push("me");
      },
      fileTriageIssue(triage) {
        writes.push(`triage ${triage.title}`);
        triageIssues.push(triage);
        return 200 + triageIssues.length;
      },
      block(number, by) {
        writes.push(`block #${number} by #${by}`);
        find(number).openBlockers += 1;
      },
      openPullRequest(pr) {
        writes.push(`pr ${pr.branch}: ${pr.title}`);
        pullRequests.push(pr);
        return 100 + pullRequests.length;
      },
    },
    builder: {
      build(component) {
        writes.push(`build ${component}`);
        const branch = `build-component-${component.toLowerCase()}`;
        return {
          branch,
          worktree: `/repo/.claude/worktrees/${branch}`,
          ok: true,
          summary: "success: 39 turns, 3 min, ~$1.05 (estimate)",
          gaps: undefined,
          ...sessions[component],
        };
      },
      push(build) {
        writes.push(`push ${build.branch}`);
      },
    },
    log: (line) => log.push(line),
  };
  return { ports, writes, log, pullRequests, triageIssues };
}
