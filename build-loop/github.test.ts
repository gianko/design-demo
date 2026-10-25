import { describe, expect, test } from "vitest";
import { GhError, githubTracker } from "./github.ts";

// A `gh` that answers from a script, keyed by the call's first arguments, and
// records every call. An answer may be a function, which can throw.
function fakeGh(
  answers: [prefix: string, output: string | ((args: string[]) => string)][]
) {
  const calls: string[][] = [];
  const gh = (args: string[]) => {
    calls.push(args);
    const line = args.join(" ");
    const answer = answers.find(([prefix]) => line.startsWith(prefix));
    if (!answer) throw new Error(`Unexpected gh ${line}`);
    const [, output] = answer;
    return typeof output === "string" ? output : output(args);
  };
  return { gh, calls };
}

// Answers that fail with these stderr texts, one per call, then give output.
function failing(stderrs: string[], output: string) {
  let calls = 0;
  return (args: string[]) => {
    const stderr = stderrs[calls++];
    if (stderr !== undefined) throw new GhError(args, stderr);
    return output;
  };
}

const refused =
  'Post "https://api.github.com/graphql": dial tcp 140.82.112.6:443: connect: connection refused\n';
const reset =
  "read tcp 10.0.0.2:51234->140.82.112.6:443: read: connection reset by peer\n";

// The pauses between attempts, recorded instead of slept.
function tracker(gh: (args: string[]) => string) {
  const pauses: number[] = [];
  return {
    tracker: githubTracker(gh, "gianko/design-demo", {
      wait: (ms) => pauses.push(ms),
    }),
    pauses,
  };
}

const commands = (calls: string[][]) =>
  calls.map((args) => args.slice(0, 2).join(" "));

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

  test("reports each workflow whose latest finished run on main failed", () => {
    // Newest first, as `gh run list` prints them.
    const runs = [
      { workflowName: "CI", status: "in_progress", conclusion: "", url: "u5" },
      {
        workflowName: "CI",
        status: "completed",
        conclusion: "success",
        url: "u4",
      },
      {
        workflowName: "Gate e2e",
        status: "completed",
        conclusion: "failure",
        url: "u3",
      },
      {
        workflowName: "CI",
        status: "completed",
        conclusion: "failure",
        url: "u2",
      },
      {
        workflowName: "Deploy",
        status: "completed",
        conclusion: "cancelled",
        url: "u1",
      },
    ];
    const { gh, calls } = fakeGh([["run list", JSON.stringify(runs)]]);

    expect(githubTracker(gh, "gianko/design-demo").mainFailures()).toEqual([
      "Gate e2e: failure (u3)",
    ]);
    expect(calls[0]).toEqual([
      "run",
      "list",
      "--repo",
      "gianko/design-demo",
      "--branch",
      "main",
      "--limit",
      "100",
      "--json",
      "workflowName,status,conclusion,url",
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

  // `Closes #N` in the PR body links it. GitHub lists a merged PR there too,
  // which is how #62 still showed one.
  test.each([
    [["MERGED", "OPEN"], true],
    [["MERGED", "CLOSED"], false],
    [[], false],
  ])(
    "asks GitHub for the PRs that close an issue, counting only open ones (%j)",
    (states, open) => {
      const response = {
        data: {
          repository: {
            issue: {
              closedByPullRequestsReferences: {
                nodes: states.map((state) => ({ state })),
              },
            },
          },
        },
      };
      const { gh, calls } = fakeGh([["api graphql", JSON.stringify(response)]]);

      expect(
        githubTracker(gh, "gianko/design-demo").hasOpenPullRequest(62)
      ).toBe(open);
      expect(calls[0]).toEqual(
        expect.arrayContaining([
          "-f",
          "owner=gianko",
          "-f",
          "name=design-demo",
          "-F",
          "number=62",
        ])
      );
      expect(calls[0]!.join(" ")).toContain("closedByPullRequestsReferences");
    }
  );
});

describe("githubTracker, when a gh call fails", () => {
  test("retries a refused connection after a pause, and creates the issue once", () => {
    const { gh, calls } = fakeGh([
      [
        "issue create",
        failing(
          [refused],
          "https://github.com/gianko/design-demo/issues/201\n"
        ),
      ],
      ["issue list", "[]"],
    ]);
    const { tracker: github, pauses } = tracker(gh);

    expect(
      github.fileTriageIssue({ title: "Text gap: No prose width", body: "…" })
    ).toBe(201);
    expect(commands(calls)).toEqual([
      "issue create",
      "issue list",
      "issue create",
    ]);
    expect(pauses).toEqual([1000]);
  });

  test.each([
    [
      "a validation error",
      "HTTP 422: Validation Failed (https://api.github.com/…)\n",
    ],
    ["a missing issue", "HTTP 404: Not Found (https://api.github.com/…)\n"],
    ["no auth", "HTTP 401: Bad credentials (https://api.github.com/…)\n"],
  ])("throws %s on the first attempt", (_, stderr) => {
    const { gh, calls } = fakeGh([["api", failing([stderr], "{}")]]);
    const { tracker: github, pauses } = tracker(gh);

    expect(() => github.block(61, 201)).toThrow(stderr.trim());
    expect(calls).toHaveLength(1);
    expect(pauses).toEqual([]);
  });

  test("returns the issue a lost response already filed, and files no second one", () => {
    const { gh, calls } = fakeGh([
      ["issue create", failing([reset], "unreachable")],
      [
        "issue list",
        JSON.stringify([
          { number: 199, title: "Text gap: Muted text on tinted surfaces" },
          { number: 201, title: "Text gap: No prose width" },
        ]),
      ],
    ]);
    const { tracker: github } = tracker(gh);

    expect(
      github.fileTriageIssue({ title: "Text gap: No prose width", body: "…" })
    ).toBe(201);
    expect(commands(calls)).toEqual(["issue create", "issue list"]);
    expect(calls[1]).toEqual(
      expect.arrayContaining(["--label", "needs-triage", "--state", "open"])
    );
  });

  test("returns the PR a lost response already opened from the branch", () => {
    const { gh, calls } = fakeGh([
      ["pr create", failing(["HTTP 502: Bad Gateway\n"], "unreachable")],
      ["pr list", JSON.stringify([{ number: 120 }])],
    ]);
    const { tracker: github } = tracker(gh);

    expect(
      github.openPullRequest({
        branch: "build-component-heading",
        title: "Build component: Heading",
        body: "Closes #62",
      })
    ).toBe(120);
    expect(commands(calls)).toEqual(["pr create", "pr list"]);
    expect(calls[1]).toEqual(
      expect.arrayContaining(["--head", "build-component-heading"])
    );
  });

  test("counts a blocking edge a lost response already added as added", () => {
    const { gh, calls } = fakeGh([
      ["api repos/gianko/design-demo/issues/201 ", "5971779616\n"],
      [
        "api --method POST",
        failing(["net/http: TLS handshake timeout\n"], "{}"),
      ],
      [
        "api repos/gianko/design-demo/issues/61/dependencies/blocked_by",
        JSON.stringify([{ id: 5971779616 }]),
      ],
    ]);
    const { tracker: github } = tracker(gh);

    github.block(61, 201);

    expect(calls.map((args) => args.slice(0, 3).join(" "))).toEqual([
      "api repos/gianko/design-demo/issues/201 --jq",
      "api --method POST",
      "api repos/gianko/design-demo/issues/61/dependencies/blocked_by?per_page=100",
    ]);
  });

  test("gives up after a few transient failures, pausing longer each time", () => {
    const { gh, calls } = fakeGh([
      ["issue edit", failing([refused, refused, refused, refused], "")],
    ]);
    const { tracker: github, pauses } = tracker(gh);

    expect(() => github.claim(54)).toThrow("connection refused");
    expect(calls).toHaveLength(4);
    expect(pauses).toEqual([1000, 2000, 4000]);
  });
});
