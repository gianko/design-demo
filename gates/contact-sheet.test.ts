import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  FullConfig,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { afterEach, beforeEach, expect, it } from "vitest";
import type { Theme } from "../.storybook/globals.ts";
import ContactSheet from "./contact-sheet.ts";
import { annotation, renderTitle, renders, shotName } from "./stories.ts";

let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "contact-sheet-"));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

const png = (name: string) => ({
  name,
  contentType: "image/png",
  body: Buffer.from(name),
});

// One admin-density render as Playwright reports it to the reporter.
function render(
  story: string,
  theme: Theme,
  status: TestResult["status"],
  attachments: ReturnType<typeof png>[],
  annotations: { type: string }[] = []
) {
  const shot = renders([{ id: story, tags: [] }]).find(
    (r) => r.theme === theme && r.density === "admin"
  )!;
  const test = {
    title: renderTitle(shot),
    parent: { title: story },
    annotations: [{ type: annotation.shot, description: shotName(shot) }],
  } as unknown as TestCase;
  const result = { status, attachments, annotations } as unknown as TestResult;
  return [test, result] as const;
}

async function sheet(...renders: ReturnType<typeof render>[]) {
  const reporter = new ContactSheet({ outputFolder: folder });
  reporter.onBegin({ configFile: join(folder, "x.ts") } as FullConfig);
  for (const [test, result] of renders) reporter.onTestEnd(test, result);
  await reporter.onEnd();
  const html = await readFile(join(folder, "index.html"), "utf8");
  const page = new DOMParser().parseFromString(html, "text/html");
  const heading = (title: string) =>
    [...page.querySelectorAll("h3")].find((h3) =>
      h3.textContent?.startsWith(title)
    );
  return { page, heading };
}

it("marks a render whose baseline is new, for the human to approve", async () => {
  const { heading } = await sheet(
    render(
      "button--primary",
      "light",
      "passed",
      [png("rest")],
      [{ type: annotation.newBaseline }]
    ),
    render("button--primary", "dark", "passed", [png("rest")])
  );

  expect(heading("light · admin")?.textContent).toContain("new baseline");
  expect(heading("dark · admin")?.textContent).not.toContain("new baseline");
});

it("marks a render that failed a gate", async () => {
  const { heading } = await sheet(
    render("button--primary", "light", "failed", [png("rest")]),
    render("button--primary", "dark", "passed", [png("rest")])
  );

  expect(heading("light · admin")?.textContent).toContain("failed");
  expect(heading("dark · admin")?.textContent).not.toContain("failed");
});

it("shows every shot the pass takes and none of Playwright's diff images", async () => {
  const { page } = await sheet(
    render("button--primary", "light", "failed", [
      png("rest"),
      png("focus"),
      png("hover"),
      png("pressed"),
      png("mid-animation"),
      png("button--primary--light-admin-actual.png"),
      png("button--primary--light-admin-diff.png"),
    ])
  );

  const shown = [...page.querySelectorAll("img")].map((img) =>
    img.getAttribute("src")
  );
  expect(shown).toEqual([
    "button--primary--light-admin--rest.png",
    "button--primary--light-admin--focus.png",
    "button--primary--light-admin--hover.png",
    "button--primary--light-admin--pressed.png",
    "button--primary--light-admin--mid-animation.png",
  ]);
  expect((await readdir(folder)).toSorted()).toEqual(
    [...(shown as string[]), "index.html"].toSorted()
  );
});

it("groups renders under their story", async () => {
  const { page } = await sheet(
    render("card--default", "light", "passed", [png("rest")]),
    render("button--primary", "light", "passed", [png("rest")])
  );

  expect(
    [...page.querySelectorAll("section h2")].map((h2) => h2.textContent)
  ).toEqual(["button--primary", "card--default"]);
});
