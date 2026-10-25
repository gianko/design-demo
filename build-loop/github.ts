// The build loop's Tracker on GitHub, through the `gh` CLI, as
// docs/agents/issue-tracker.md sets out: native issue dependencies for
// blocking, an assignee for a claim.

import { spawnSync } from "node:child_process";
import type { Issue, Tracker } from "./driver.ts";

// Runs `gh` with these arguments and returns its stdout. A failed call
// throws a GhError.
export type Gh = (args: string[]) => string;

// A `gh` call that exited non-zero, with what it printed to stderr, which is
// what tells a transient failure from one a retry won't fix.
export class GhError extends Error {
  readonly stderr: string;
  constructor(args: string[], stderr: string) {
    super(`Command failed: gh ${args.join(" ")}\n${stderr.trim()}`);
    this.stderr = stderr;
  }
}

export const gh: Gh = (args) => {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Echoed, as when stderr went straight to the terminal.
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new GhError(args, result.stderr);
  return result.stdout;
};

// A failure on the way to GitHub or inside it: the connection is refused or
// reset, DNS fails, it times out, or GitHub answers 5xx. A 4xx, a validation
// error or bad auth fails the same way on every attempt.
const transientFailure =
  /connection refused|connection reset|no such host|error connecting to|timeout|timed out|unexpected EOF|HTTP 5\d\d/i;
const attempts = 4;
const firstPause = 1000;

function isTransient(error: unknown) {
  return error instanceof GhError && transientFailure.test(error.stderr);
}

// Blocks the thread: the loop's calls are synchronous.
function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

type RestIssue = {
  number: number;
  title: string;
  assignees: { login: string }[];
  pull_request?: unknown;
  issue_dependencies_summary?: { blocked_by: number };
};

type PrState = { state: "OPEN" | "CLOSED" | "MERGED" };

type Run = {
  workflowName: string;
  status: string;
  conclusion: string;
  url: string;
};

// The conclusions of a run that went red; `cancelled` and `skipped` didn't.
const failed = new Set(["failure", "timed_out", "startup_failure"]);

// Every call retries a transient failure, pausing twice as long each time.
// A call that creates something first looks, before each retry, for what a
// lost response may already have created, and returns that instead.
export function githubTracker(
  gh: Gh,
  repo: string,
  { wait = sleep }: { wait?: (ms: number) => void } = {}
): Tracker {
  const retrying = <T>(run: () => T, made?: () => T | undefined): T => {
    for (let attempt = 1; ; attempt++) {
      try {
        const existing = attempt > 1 ? made?.() : undefined;
        return existing ?? run();
      } catch (error) {
        if (attempt === attempts || !isTransient(error)) throw error;
        wait(firstPause * 2 ** (attempt - 1));
      }
    }
  };
  const call = (args: string[], made?: () => string | undefined) =>
    retrying(() => gh(args), made);
  const [owner, name] = repo.split("/");

  return {
    buildLoopIssues() {
      // The issues endpoint lists PRs too.
      const pages: RestIssue[][] = JSON.parse(
        call([
          "api",
          "--paginate",
          "--slurp",
          `repos/${repo}/issues?labels=build-loop&state=open&per_page=100`,
        ])
      );
      return pages
        .flat()
        .filter((issue) => issue.pull_request === undefined)
        .map(toIssue);
    },

    mainFailures() {
      // Newest first. A workflow whose paths a push didn't touch has no run
      // for it, so its latest run may be older than the others'.
      const runs: Run[] = JSON.parse(
        call([
          "run",
          "list",
          "--repo",
          repo,
          "--branch",
          "main",
          "--limit",
          "100",
          "--json",
          "workflowName,status,conclusion,url",
        ])
      );
      const latest = new Map<string, Run>();
      for (const run of runs) {
        if (run.status === "completed" && !latest.has(run.workflowName)) {
          latest.set(run.workflowName, run);
        }
      }
      return [...latest.values()]
        .filter((run) => failed.has(run.conclusion))
        .map((run) => `${run.workflowName}: ${run.conclusion} (${run.url})`);
    },

    // Assigning twice is still one assignee.
    claim(issue) {
      call([
        "issue",
        "edit",
        String(issue),
        "--repo",
        repo,
        "--add-assignee",
        "@me",
      ]);
    },
    fileTriageIssue({ title, body }) {
      const filed = () => {
        const open: { number: number; title: string }[] = JSON.parse(
          gh([
            "issue",
            "list",
            "--repo",
            repo,
            "--label",
            "needs-triage",
            "--state",
            "open",
            "--limit",
            "1000",
            "--json",
            "number,title",
          ])
        );
        return open.find((issue) => issue.title === title)?.number;
      };
      return retrying(
        () =>
          numberOf(
            gh([
              "issue",
              "create",
              "--repo",
              repo,
              "--title",
              title,
              "--body",
              body,
              "--label",
              "needs-triage",
            ])
          ),
        filed
      );
    },

    block(issue, by) {
      const id = call([
        "api",
        `repos/${repo}/issues/${by}`,
        "--jq",
        ".id",
      ]).trim();
      const edges = `repos/${repo}/issues/${issue}/dependencies/blocked_by`;
      const add = () => {
        gh(["api", "--method", "POST", edges, "-F", `issue_id=${id}`]);
        return true;
      };
      const added = () => {
        const blockers: { id: number }[] = JSON.parse(
          gh(["api", `${edges}?per_page=100`])
        );
        return (
          blockers.some((blocker) => String(blocker.id) === id) || undefined
        );
      };
      retrying(add, added);
    },
    openPullRequest({ branch, title, body }) {
      const opened = () => {
        const open: { number: number }[] = JSON.parse(
          gh([
            "pr",
            "list",
            "--repo",
            repo,
            "--head",
            branch,
            "--state",
            "open",
            "--json",
            "number",
          ])
        );
        return open[0]?.number;
      };
      return retrying(
        () =>
          numberOf(
            gh([
              "pr",
              "create",
              "--repo",
              repo,
              "--base",
              "main",
              "--head",
              branch,
              "--title",
              title,
              "--body",
              body,
            ])
          ),
        opened
      );
    },
    hasOpenPullRequest(issue) {
      // PRs whose body closes the issue, as `Closes #N` does. GitHub lists
      // merged ones too, so only the open ones count.
      const response: {
        data: {
          repository: {
            issue: { closedByPullRequestsReferences: { nodes: PrState[] } };
          };
        };
      } = JSON.parse(
        call([
          "api",
          "graphql",
          "-f",
          "query=query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { issue(number: $number) { closedByPullRequestsReferences(first: 100) { nodes { state } } } } }",
          "-f",
          `owner=${owner}`,
          "-f",
          `name=${name}`,
          "-F",
          `number=${issue}`,
        ])
      );
      return response.data.repository.issue.closedByPullRequestsReferences.nodes.some(
        (pr) => pr.state === "OPEN"
      );
    },
  };
}

// `gh issue create` and `gh pr create` print the new URL, which ends in its
// number.
function numberOf(url: string): number {
  const number = /\/(\d+)\s*$/.exec(url)?.[1];
  if (!number) throw new Error(`gh printed no issue or PR URL: ${url}`);
  return Number(number);
}

function toIssue(issue: RestIssue): Issue {
  // Without the summary nothing says the issue is unblocked.
  const summary = issue.issue_dependencies_summary;
  if (!summary) {
    throw new Error(
      `GitHub reported no dependencies for #${issue.number}, so whether it's blocked is unknown.`
    );
  }
  return {
    number: issue.number,
    title: issue.title,
    openBlockers: summary.blocked_by,
    assignees: issue.assignees.map((assignee) => assignee.login),
  };
}
