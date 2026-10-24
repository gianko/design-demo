---
name: figma-sync-tokens
description: Sync the design tokens into the Dill Demo Figma file: dry-run, show the diff, apply on confirmation. Usage: /figma-sync-tokens
disable-model-invocation: true
---

You drive `figma:sync-tokens` ([ADR 0007](../../../docs/adr/0007-figma-sync-is-a-generated-one-call-script.md)). `pnpm figma:sync-tokens` writes one Plugin API script from `tokens/figma.json`, and you pass it to `use_figma` **verbatim**. You are a courier: every byte of `code` comes from the script file, and the script carries its own evidence. If something needs other Plugin API code, stop and tell the human.

The file is [Dill Demo](https://www.figma.com/design/qgCHZ55XTiozWpZvASRzJE/Dill-Demo), `fileKey` `qgCHZ55XTiozWpZvASRzJE`. It runs on the human's Figma login. Before the first call, load `figma:figma-use` and open a session with `create_session`, as the Figma MCP asks.

## 1. Build the payload

Run `pnpm tokens`. If `tokens/figma.json` changed, say so: the sync pushes the working tree's tokens, committed or not.

## 2. Dry run

Run `pnpm figma:sync-tokens --dry-run`, read the file it prints, and pass its whole content as `code` to `use_figma`. The call writes nothing.

Show the human the report: `counts`, then the `created` and `updated` lists, then each orphan with its ID. The step is done when they have seen the diff.

If `counts.changes` is 0 and the human names no orphans to prune, the file is in sync: say so and stop.

## 3. Apply, on confirmation

Ask the human to confirm the write, and whether to prune any orphans. Orphans stay unless the human names their IDs.

Run `pnpm figma:sync-tokens`, adding `--prune <id>,<id>` for the IDs they named, and pass that file to `use_figma` the same way. One call is one transaction: if it throws, Figma keeps nothing from it.

Report `counts` and `pruned`. `unbound` lists style fields that didn't stay bound after the write: it should be empty, so if it isn't, show it to the human.

## 4. Confirm with a dry run

Repeat step 2. The sync is done when this dry run reports `counts.changes` 0. Anything else, show it to the human and stop.

## When a call throws

- **Checksum mismatch**: the `code` you passed didn't match the file byte for byte, so nothing was written. Read the file again and pass it unchanged.
- **Over the 50,000-char limit**: `pnpm figma:sync-tokens` fails before you call anything. `--split` writes one script per collection plus one for styles, to run in order. Each is atomic, but the sync as a whole isn't, so ask the human first.
- **A variable whose type changed**: the error names its ID. It is replaced only once pruned, so put the ID to the human as a prune.
- **Anything else**: show the error. Figma rolled the call back.
