// The build loop's Tracker on GitHub, through the `gh` CLI, as
// docs/agents/issue-tracker.md sets out: native issue dependencies for
// blocking, an assignee for a claim.

import { execFileSync } from "node:child_process";
import type { Issue, Tracker } from "./driver.ts";

// Runs `gh` with these arguments and returns its stdout.
export type Gh = (args: string[]) => string;

export const gh: Gh = (args) =>
  execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

type RestIssue = {
  number: number;
  title: string;
  assignees: { login: string }[];
  pull_request?: unknown;
  issue_dependencies_summary?: { blocked_by: number };
};

export function githubTracker(gh: Gh, repo: string): Tracker {
  return {
    buildLoopIssues() {
      // The issues endpoint lists PRs too.
      const pages: RestIssue[][] = JSON.parse(
        gh([
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

    claim(issue) {
      gh([
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
      return numberOf(
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
      );
    },

    block(issue, by) {
      const id = gh(["api", `repos/${repo}/issues/${by}`, "--jq", ".id"]);
      gh([
        "api",
        "--method",
        "POST",
        `repos/${repo}/issues/${issue}/dependencies/blocked_by`,
        "-F",
        `issue_id=${id.trim()}`,
      ]);
    },
    openPullRequest({ branch, title, body }) {
      return numberOf(
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
