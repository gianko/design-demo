// A Playwright reporter that writes the contact sheet: one page with every
// shot of the run, grouped by story, for the critique and for the human
// approving new baselines on the component's PR (ADR 0006, ADR 0009).
// index.html links the PNGs beside it, which the critique reads.
// contact-sheet.html inlines them, so CI can upload that one file unzipped
// and the PR can link it.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type {
  FullConfig,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { annotation, shots, type Shot } from "./stories.ts";
import { escapeHtml } from "../format.ts";

type ShotFile = { name: Shot; file: string; path?: string; body?: Buffer };

type Row = {
  story: string;
  render: string;
  name: string;
  status: TestResult["status"];
  isNew: boolean;
  shots: ShotFile[];
};

// The pass's own shots; Playwright's -actual and -diff images aren't one.
const isShot = (name: string): name is Shot =>
  (shots as readonly string[]).includes(name);

export default class ContactSheet implements Reporter {
  #folder: string;
  #rows: Row[] = [];

  constructor({ outputFolder }: { outputFolder: string }) {
    this.#folder = outputFolder;
  }

  onBegin(config: FullConfig) {
    this.#folder = resolve(dirname(config.configFile ?? "."), this.#folder);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const name = test.annotations.find(
      (a) => a.type === annotation.shot
    )?.description;
    if (!name) return;
    this.#rows.push({
      story: test.parent.title,
      render: test.title,
      name,
      status: result.status,
      isNew: result.annotations.some((a) => a.type === annotation.newBaseline),
      shots: result.attachments.flatMap(({ name: shot, path, body }) =>
        isShot(shot)
          ? [{ name: shot, file: `${name}--${shot}.png`, path, body }]
          : []
      ),
    });
  }

  async onEnd() {
    await rm(this.#folder, { recursive: true, force: true });
    await mkdir(this.#folder, { recursive: true });
    const inlined = new Map<ShotFile, string>();
    for (const shot of this.#rows.flatMap((row) => row.shots)) {
      const png = shot.path ? await readFile(shot.path) : shot.body;
      if (!png) continue;
      await writeFile(join(this.#folder, shot.file), png);
      inlined.set(shot, `data:image/png;base64,${png.toString("base64")}`);
    }
    await writeFile(
      join(this.#folder, "index.html"),
      page(this.#rows, (shot) => shot.file)
    );
    await writeFile(
      join(this.#folder, "contact-sheet.html"),
      page(this.#rows, (shot) => inlined.get(shot) ?? "")
    );
  }

  printsToStdio() {
    return false;
  }
}

// Where each shot's <img> loads it from.
type Src = (shot: ShotFile) => string;

function page(rows: Row[], src: Src): string {
  const stories = new Map<string, Row[]>();
  for (const row of rows.toSorted((a, b) => a.name.localeCompare(b.name))) {
    stories.set(row.story, [...(stories.get(row.story) ?? []), row]);
  }
  const sections = [...stories].map(
    ([story, renders]) =>
      `<section><h2>${escapeHtml(story)}</h2>${renders.map((row) => render(row, src)).join("")}</section>`
  );
  const newCount = rows.filter((row) => row.isNew).length;
  return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact sheet</title>
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 24px 16px; background: #f4f2f5; color: #1d1a20; }
  section { margin-bottom: 40px; }
  h3 { font-size: 14px; margin: 24px 0 8px; }
  .shots { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
  figure { margin: 0; max-width: 100%; }
  figcaption { font-size: 12px; color: #5c5563; margin-top: 4px; }
  img { display: block; max-width: 100%; outline: 1px solid #d6d1da; }
  .flag { font-size: 12px; font-weight: 600; padding: 1px 6px; border-radius: 4px; margin-left: 8px; }
  .new { background: #fdf0c2; color: #6b4e00; }
  .failed { background: #fbd9d9; color: #8a1c1c; }
</style>
<h1>Contact sheet</h1>
<p>${rows.length} renders, ${newCount} with a <span class="flag new">new baseline</span> that nobody has approved yet.</p>
${sections.join("\n")}
`;
}

function render(row: Row, src: Src): string {
  const flags = [
    row.isNew ? '<span class="flag new">new baseline</span>' : "",
    row.status === "passed"
      ? ""
      : `<span class="flag failed">${row.status}</span>`,
  ].join("");
  const shots = row.shots
    .map(
      (shot) =>
        `<figure><img src="${escapeHtml(src(shot))}" alt="${escapeHtml(`${row.name} ${shot.name}`)}"><figcaption>${escapeHtml(shot.name)}</figcaption></figure>`
    )
    .join("");
  return `<h3>${escapeHtml(row.render)}${flags}</h3><div class="shots">${shots}</div>`;
}
