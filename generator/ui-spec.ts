// The UI spec's wire schema (ADR 0003, ADR 0004): one flat node list, since
// structured outputs reject recursive schemas and cap optional and union-typed
// parameters. Every field is required, absent values are null or empty, and
// prop values are JSON strings, so the per-component prop check happens in
// gate 1, locally, against the registry.

import { z } from "zod";
import { densities } from "../.storybook/globals.ts";

export function wireSchema(component: z.ZodType<string> = z.string()) {
  return z.object({
    audience: z
      .enum(densities)
      .describe("Copied from the screen brief's frontmatter."),
    nodes: z
      .array(
        z.object({
          id: z.string().describe("Unique in this UI spec, in kebab-case."),
          component: component.describe("A registered library component."),
          parent: z
            .string()
            .nullable()
            .describe("The parent node's id; null only on the Screen root."),
          slot: z
            .string()
            .nullable()
            .describe(
              "The parent's slot this node sits in; null only on the root."
            ),
          props: z
            .array(
              z.object({
                name: z.string(),
                value: z
                  .string()
                  .describe(
                    "The prop's value as JSON, e.g. '\"Paid\"' or 'true'."
                  ),
              })
            )
            .describe("The component's props, each as a name and JSON value."),
          when: z
            .array(z.string())
            .describe(
              "Screen states this node shows in; empty to show it in every state."
            ),
          action: z
            .string()
            .nullable()
            .describe("The declared action this node runs, or null."),
        })
      )
      .describe("Every node, siblings in the order they render."),
    states: z
      .array(
        z.object({
          name: z.string().describe("The screen state's id from the brief."),
          fixture: z.string().describe("The fixture variant it renders."),
        })
      )
      .describe("Declared screen states, besides the default."),
    actions: z
      .array(
        z.object({
          name: z.string().describe("The action's id from the brief."),
          operation: z.string().describe("The fixtures module's operation."),
          pending: z
            .string()
            .describe("The id of the node that shows pending."),
          to: z.object({
            success: z.string().describe("The screen state on success."),
            failure: z.string().describe("The screen state on failure."),
          }),
        })
      )
      .describe("Declared actions."),
  });
}

export type UiSpec = z.infer<ReturnType<typeof wireSchema>>;
export type UiNode = UiSpec["nodes"][number];
