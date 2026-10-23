import { describe, expect, test } from "vitest";
import { githubTracker } from "./github.ts";

// A `gh` that answers from a script, keyed by the call's first arguments, and
// records every call.
function fakeGh(answers: [prefix: string, output: string][]) {
  const calls: string[][] = [];
  const gh = (args: string[]) => {
    calls.push(args);
    const line = args.join(" ");
    const answer = answers.find(([prefix]) => line.startsWith(prefix));
    if (!answer) throw new Error(`Unexpected gh ${line}`);
    return answer[1];
  };
  return { gh, calls };
}

describe("githubTracker", () => {
  test("lists open build-loop issues across pages, with open blockers and assignees, and no PRs", () => {
    const pages = [
      [
        {
          number: 54,
          title: "Build component: Text",
          assignees: [],
          issue_dependencies_summary: { blocked_by: 0, total_blocked_by: 4 },
        },
        {
          number: 90,
          title: "Build component: Text",
          pull_request: { url: "…" },
          assignees: [],
        },
      ],
      [
        {
          number: 61,
          title: "Build component: Stack",
          assignees: [{ login: "gianko" }],
          issue_dependencies_summary: { blocked_by: 1, total_blocked_by: 1 },
        },
      ],
    ];
    const { gh, calls } = fakeGh([["api", JSON.stringify(pages)]]);

    expect(githubTracker(gh, "gianko/design-demo").buildLoopIssues()).toEqual([
      {
        number: 54,
        title: "Build component: Text",
        openBlockers: 0,
        assignees: [],
      },
      {
        number: 61,
        title: "Build component: Stack",
        openBlockers: 1,
        assignees: ["gianko"],
      },
    ]);
    expect(calls).toEqual([
      [
        "api",
        "--paginate",
        "--slurp",
        "repos/gianko/design-demo/issues?labels=build-loop&state=open&per_page=100",
      ],
    ]);
  });

  test("files a triage issue labelled needs-triage and returns its number", () => {
    const { gh, calls } = fakeGh([
      ["issue create", "https://github.com/gianko/design-demo/issues/201\n"],
    ]);

    expect(
      githubTracker(gh, "gianko/design-demo").fileTriageIssue({
        title: "Text gap: No prose width",
        body: "**Call:** none.",
      })
    ).toBe(201);
    expect(calls).toEqual([
      [
        "issue",
        "create",
        "--repo",
        "gianko/design-demo",
        "--title",
        "Text gap: No prose width",
        "--body",
        "**Call:** none.",
        "--label",
        "needs-triage",
      ],
    ]);
  });

  test("claims an issue by assigning it to the gh user", () => {
    const { gh, calls } = fakeGh([["issue edit", ""]]);

    githubTracker(gh, "gianko/design-demo").claim(54);

    expect(calls).toEqual([
      [
        "issue",
        "edit",
        "54",
        "--repo",
        "gianko/design-demo",
        "--add-assignee",
        "@me",
      ],
    ]);
  });

  test("opens the PR from the session's branch onto main and returns its number", () => {
    const { gh, calls } = fakeGh([
      ["pr create", "https://github.com/gianko/design-demo/pull/101\n"],
    ]);

    expect(
      githubTracker(gh, "gianko/design-demo").openPullRequest({
        branch: "build-component-text",
        title: "Build component: Text",
        body: "Closes #54",
      })
    ).toBe(101);
    expect(calls).toEqual([
      [
        "pr",
        "create",
        "--repo",
        "gianko/design-demo",
        "--base",
        "main",
        "--head",
        "build-component-text",
        "--title",
        "Build component: Text",
        "--body",
        "Closes #54",
      ],
    ]);
  });

  // Reading a missing summary as zero would take a blocked issue.
  test("refuses an issue GitHub reports without a dependencies summary", () => {
    const pages = [
      [
        {
          number: 54,
          title: "Build component: Text",
          assignees: [],
          issue_dependencies_summary: { blocked_by: 0, total_blocked_by: 0 },
        },
        { number: 61, title: "Build component: Stack", assignees: [] },
      ],
    ];
    const { gh } = fakeGh([["api", JSON.stringify(pages)]]);

    expect(() =>
      githubTracker(gh, "gianko/design-demo").buildLoopIssues()
    ).toThrow(
      "GitHub reported no dependencies for #61, so whether it's blocked is unknown."
    );
  });

  test("refuses gh output that ends in no issue or PR URL", () => {
    // `gh pr create` can print a warning instead of the URL.
    const { gh } = fakeGh([["pr create", "Warning: 1 uncommitted change\n"]]);

    expect(() =>
      githubTracker(gh, "gianko/design-demo").openPullRequest({
        branch: "build-component-text",
        title: "Build component: Text",
        body: "Closes #54",
      })
    ).toThrow("gh printed no issue or PR URL: Warning: 1 uncommitted change");
  });

  // GitHub's dependencies API takes the blocker's database id, not its number.
  test("blocks an issue with a native dependency on the blocker's database id", () => {
    const { gh, calls } = fakeGh([
      ["api repos/gianko/design-demo/issues/201 ", "5971779616\n"],
      ["api --method POST", "{}"],
    ]);

    githubTracker(gh, "gianko/design-demo").block(61, 201);

    expect(calls).toEqual([
      ["api", "repos/gianko/design-demo/issues/201", "--jq", ".id"],
      [
        "api",
        "--method",
        "POST",
        "repos/gianko/design-demo/issues/61/dependencies/blocked_by",
        "-F",
        "issue_id=5971779616",
      ],
    ]);
  });
});
