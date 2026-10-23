// The code step's static gates on one generated file (ADR 0010): gate 2
// (token lint) and the static taste rules through the repo's own ESLint
// config, and gate 3 through tsc with the repo's own tsconfig, the same
// checks `pnpm gate` runs as `pnpm lint` and `pnpm typecheck`.

import { dirname, relative, resolve } from "node:path";
import { ESLint } from "eslint";
import ts from "typescript";
import type { Failure } from "./failure.ts";

const repo = resolve(import.meta.dirname, "..");

export type GateResult = "pass" | "fail" | "not-run";

export type CodeGates = {
  gates: { "gate 2": GateResult; "gate 3": GateResult; "gate 7": GateResult };
  failures: Failure[];
  // ESLint's and tsc's own output, kept beside the attempt.
  raw: { eslint: ESLint.LintResult[]; tsc: string[] };
};

// `file` is the generated screen where it was written, under `.generated/` or
// `evals/runs/`, which `pnpm lint` ignores and these gates lint with ignores
// off. `keptAt` is where `pnpm keep` would copy it, inside `src/screens/`:
// tsc checks the file there, so its barrel import resolves as it will once
// kept.
export async function codeGates(
  file: string,
  source: string,
  keptAt: string
): Promise<CodeGates> {
  const eslint = new ESLint({ cwd: repo, ignore: false });
  const results = await eslint.lintText(source, { filePath: file });
  const lint = results.flatMap((result) => result.messages);
  const gate2: Failure[] = [];
  const gate7: Failure[] = [];
  for (const message of lint) {
    const rule = message.ruleId ?? "parse-error";
    const taste =
      rule.startsWith("taste/") || rule.startsWith("taste-exemptions/");
    (taste ? gate7 : gate2).push({
      gate: taste ? "gate 7" : "gate 2",
      rule,
      location: `L${message.line}:${message.column}`,
      message: message.message,
    });
  }

  const diagnostics = typecheck(source, resolve(repo, keptAt));
  const gate3: Failure[] = diagnostics.map((diagnostic) => ({
    gate: "gate 3",
    rule: `TS${diagnostic.code}`,
    location: location(diagnostic, resolve(repo, keptAt)),
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
  }));

  return {
    gates: {
      "gate 2": gate2.length ? "fail" : "pass",
      "gate 3": gate3.length ? "fail" : "pass",
      "gate 7": gate7.length ? "fail" : "pass",
    },
    failures: [...gate2, ...gate3, ...gate7],
    raw: {
      eslint: results,
      tsc: diagnostics.map((diagnostic) =>
        ts.formatDiagnostic(diagnostic, {
          getCanonicalFileName: (name) => name,
          getCurrentDirectory: () => repo,
          getNewLine: () => "\n",
        })
      ),
    },
  };
}

// One program rooted at the generated file alone, served from memory at
// `path`, with the repo's compiler options.
function typecheck(source: string, path: string) {
  const configPath = resolve(repo, "tsconfig.json");
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    dirname(configPath)
  );
  const host = ts.createCompilerHost(options);
  const { getSourceFile, fileExists, readFile } = host;
  host.fileExists = (name) => resolve(name) === path || fileExists(name);
  host.readFile = (name) => (resolve(name) === path ? source : readFile(name));
  host.getSourceFile = (name, languageVersion, ...rest) =>
    resolve(name) === path
      ? ts.createSourceFile(name, source, languageVersion, true)
      : getSourceFile(name, languageVersion, ...rest);
  const program = ts.createProgram({ rootNames: [path], options, host });
  return ts.getPreEmitDiagnostics(program);
}

// L<line>:<col> in the model's own file; anything else names its file too.
function location(diagnostic: ts.Diagnostic, path: string) {
  const { file, start } = diagnostic;
  if (!file || start === undefined) return "(program)";
  const { line, character } = file.getLineAndCharacterOfPosition(start);
  const at = `L${line + 1}:${character + 1}`;
  return resolve(file.fileName) === path
    ? at
    : `${relative(repo, file.fileName)} ${at}`;
}
