// markdownlint-cli2 config. Vendored skills keep their upstream style, so
// they're read from skills-lock.json and left out; the project's own skills
// under .claude/skills/ are linted like any other doc.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { skills } = JSON.parse(
  readFileSync(join(import.meta.dirname, "skills-lock.json"), "utf8")
);

export default {
  config: {
    // Paragraphs are one line each.
    MD013: false,
    // Tables stay compact; aligning them re-pads every row on each edit.
    MD060: false,
    // GitHub links bare URLs.
    MD034: false,
    // AGENTS.md and similar fragments don't open with a title.
    MD041: false,
  },
  // What git ignores isn't linted either: eval runs leave Playwright's
  // error-context.md files under evals/runs/, which aren't ours to style.
  gitignore: true,
  ignores: [
    ".agents/**",
    ".claude/worktrees/**",
    ...Object.keys(skills).map((name) => `.claude/skills/${name}/**`),
    "node_modules/**",
    "storybook-static/**",
    "gates/out/**",
    ".scratch/**",
  ],
};
