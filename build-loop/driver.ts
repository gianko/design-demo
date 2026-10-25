// The build loop (spec § Build-loop driver): take the first open, unblocked
// `build-loop` issue, build its component in one headless `/build-component`
// session (ADR 0006), and open a PR that closes the issue. GitHub and the
// session sit behind the two ports below, so the loop runs against fakes.

export type Issue = {
  number: number;
  title: string;
  // Open issues blocking this one.
  openBlockers: number;
  assignees: string[];
};

export type PullRequest = { branch: string; title: string; body: string };

export interface Tracker {
  // Every open issue labelled `build-loop`.
  buildLoopIssues(): Issue[];
  // Each workflow whose latest finished run on main failed, as a line naming
  // it and linking the run; empty while main is green.
  mainFailures(): string[];
  // Assigns the issue, so the next iteration of the loop skips it.
  claim(issue: number): void;
  // Files an issue labelled `needs-triage`; returns its number.
  fileTriageIssue(issue: { title: string; body: string }): number;
  // Adds a native blocking edge: `issue` is blocked by `by`.
  block(issue: number, by: number): void;
  // Returns the PR's number.
  openPullRequest(pr: PullRequest): number;
}

// One finished session, its work still uncommitted on its own branch.
export type Build = {
  branch: string;
  worktree: string;
  // The session exited 0.
  ok: boolean;
  summary: string;
  // The session's GAPS.md, if it wrote one.
  gaps: string | undefined;
};

export interface Builder {
  build(component: string): Build;
  // Commits the session's work and pushes its branch.
  push(build: Build, message: string): void;
}

// Prints one line of the loop's progress.
export type Log = (line: string) => void;

export type Ports = { tracker: Tracker; builder: Builder; log: Log };

export function drive(
  { tracker, builder, log }: Ports,
  { dryRun }: { dryRun: boolean }
) {
  for (;;) {
    const issues = tracker.buildLoopIssues();
    const issue = firstUntaken(
      issues.filter((each) => each.openBlockers === 0)
    );
    if (!issue) {
      log("No build-loop issue is unblocked.");
      return;
    }
    // A session builds on origin/main, so a red main fails its PR for reasons
    // that aren't the component's.
    const failures = tracker.mainFailures();
    if (failures.length > 0) {
      throw new Error(
        [
          `main is red, so #${issue.number} would be built on a broken base. Fix main first:`,
          ...failures.map((failure) => `  ${failure}`),
        ].join("\n")
      );
    }
    const component = componentOf(issue);
    if (dryRun) {
      log(
        `Would take #${issue.number} ${issue.title} (/build-component ${component})`
      );
      return;
    }

    log(`Taking #${issue.number} ${issue.title}`);
    tracker.claim(issue.number);
    const build = builder.build(component);
    log(build.summary);
    // The issue stays claimed, so a rerun doesn't take it again before the
    // human has looked.
    if (!build.ok) {
      throw new Error(
        `The /build-component ${component} session for #${issue.number} failed; its work is left in ${build.worktree}.`
      );
    }
    const gaps = parseGaps(build.gaps ?? "");
    if (gaps.length === 0 && build.gaps?.trim()) {
      throw new Error(
        `${gapsPath(component)} for #${issue.number} has content but no \`## \` gap entries; its work is left in ${build.worktree}.`
      );
    }
    builder.push(
      build,
      `${component} built by a headless /build-component session\n\nFor #${issue.number}.`
    );

    // Each gap holds the next component until the human triages it. An issue
    // taken on an earlier iteration is still open until its PR merges.
    const next = firstUntaken(
      issues.filter((each) => each.number !== issue.number)
    );
    const filed = gaps.map((gap) => {
      const number = tracker.fileTriageIssue({
        title: `${component} gap: ${gap.title}`,
        body: `${gap.body}\n\nFrom \`${gapsPath(component)}\`, written by the \`/build-component ${component}\` session for #${issue.number}.`,
      });
      if (next) tracker.block(next.number, number);
      return number;
    });

    const pr = tracker.openPullRequest({
      branch: build.branch,
      title: issue.title,
      body: pullRequestBody(issue, component, build, { filed, next }),
    });
    log(`Opened PR #${pr} for #${issue.number}`);
  }
}

// Lowest number first, as the issues were filed in build order. An assigned
// issue is already taken.
function firstUntaken(issues: Issue[]): Issue | undefined {
  return issues
    .filter((issue) => issue.assignees.length === 0)
    .sort((a, b) => a.number - b.number)[0];
}

function componentOf(issue: Issue): string {
  const name = /^Build component: ([A-Z][A-Za-z0-9]*)$/.exec(issue.title)?.[1];
  if (!name) {
    throw new Error(
      `#${issue.number} "${issue.title}" doesn't name a component as "Build component: <Name>".`
    );
  }
  return name;
}

// The contact sheet's run doesn't exist yet when the PR opens, so CI comments
// its artifact link on the PR instead (.github/workflows/ci.yml).
function pullRequestBody(
  issue: Issue,
  component: string,
  build: Build,
  { filed, next }: { filed: number[]; next: Issue | undefined }
): string {
  return [
    `Closes #${issue.number}`,
    "",
    `Built by one unattended \`/build-component ${component}\` session (\`pnpm build-loop\`, ADR 0006). Nobody edited its output by hand.`,
    "",
    "**Baselines to approve:** the contact sheet CI links in a comment below.",
    "",
    "## Session",
    "",
    build.summary,
    "",
    "## Gaps",
    "",
    filed.length === 0
      ? "The session recorded no gaps."
      : `Filed as \`needs-triage\`${next ? `, each blocking #${next.number}` : ""}: ${filed.map((n) => `#${n}`).join(", ")}`,
  ].join("\n");
}

// Where a session writes its gaps, relative to its worktree.
export function gapsPath(component: string): string {
  return `src/components/${component}/GAPS.md`;
}

// The entries of a GAPS.md: one per `## ` heading, its number dropped. A
// deeper heading stays inside its entry.
function parseGaps(markdown: string): { title: string; body: string }[] {
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((entry) => {
      const [heading = "", ...rest] = entry.split("\n");
      return {
        title: heading.replace(/^\d+\.\s*/, "").trim(),
        body: rest.join("\n").trim(),
      };
    });
}
