import { tv } from "tailwind-variants/lite";
import { expect, it } from "vitest";
import { z } from "zod";
import { defineEntry, variantEnum } from "./entry.ts";
import { defineRegistry } from "./registry.ts";

const tag = tv({ variants: { status: { paid: "", overdue: "" } } });

const stubTag = defineEntry({
  name: "Tag",
  use: "A short status word.",
  props: z.object({
    status: variantEnum(tag, "status"),
    label: z.string().describe("The status word."),
  }),
});

const stubPanel = defineEntry({
  name: "Panel",
  use: "Groups related content on a surface.",
  props: z.object({
    title: z.string().optional(),
    padded: z.boolean().default(true),
  }),
  slots: { body: {}, actions: { allow: ["Tag"] } },
});

const baseline = defineRegistry([stubTag, stubPanel]);

it("serializes names, use lines, JSON Schema props and slots", () => {
  expect(baseline.serialized.spec).toMatchInlineSnapshot(`
      "[
        {
          "name": "Panel",
          "use": "Groups related content on a surface.",
          "props": {
            "type": "object",
            "properties": {
              "title": {
                "type": "string"
              },
              "padded": {
                "default": true,
                "type": "boolean"
              }
            },
            "required": [
              "padded"
            ],
            "additionalProperties": false
          },
          "slots": {
            "body": {},
            "actions": {
              "allow": [
                "Tag"
              ]
            }
          }
        },
        {
          "name": "Tag",
          "use": "A short status word.",
          "props": {
            "type": "object",
            "properties": {
              "status": {
                "type": "string",
                "enum": [
                  "paid",
                  "overdue"
                ]
              },
              "label": {
                "type": "string",
                "description": "The status word."
              }
            },
            "required": [
              "status",
              "label"
            ],
            "additionalProperties": false
          },
          "slots": {}
        }
      ]"
    `);
});

it("serializes the same entries the same way in any order", () => {
  expect(defineRegistry([stubPanel, stubTag]).serialized).toEqual(
    baseline.serialized
  );
});

it("shows both steps the same registry when no prop is code-only", () => {
  expect(baseline.serialized.code).toBe(baseline.serialized.spec);
});

const stubButton = defineEntry({
  name: "Button",
  use: "Starts an action.",
  props: z.object({
    label: z.string(),
    pending: z.boolean().optional().describe("Shows the running action."),
  }),
  codeOnly: ["pending"],
});

it("leaves a code-only prop out of the spec step's registry, and marks it in the code step's", () => {
  const { serialized } = defineRegistry([stubButton]);

  expect(JSON.parse(serialized.spec)).toEqual([
    {
      name: "Button",
      use: "Starts an action.",
      props: {
        type: "object",
        properties: { label: { type: "string" } },
        required: ["label"],
        additionalProperties: false,
      },
      slots: {},
    },
  ]);
  expect(JSON.parse(serialized.code)).toEqual([
    {
      name: "Button",
      use: "Starts an action.",
      props: {
        type: "object",
        properties: {
          label: { type: "string" },
          pending: {
            type: "boolean",
            description: "Shows the running action.",
          },
        },
        required: ["label"],
        additionalProperties: false,
      },
      codeOnly: ["pending"],
      slots: {},
    },
  ]);
});

const stubTick = defineEntry({
  name: "Tick",
  use: "The row selector a table renders.",
  props: z.object({ label: z.string() }),
  internal: true,
});

it("leaves an internal entry out of the spec step's registry and component enum, and marks it in the code step's", () => {
  const { serialized, component } = defineRegistry([stubTag, stubTick]);

  expect(serialized.spec).toBe(defineRegistry([stubTag]).serialized.spec);
  expect(JSON.parse(serialized.code)).toContainEqual({
    name: "Tick",
    use: "The row selector a table renders.",
    props: {
      type: "object",
      properties: { label: { type: "string" } },
      required: ["label"],
      additionalProperties: false,
    },
    internal: true,
    slots: {},
  });
  expect(component.safeParse("Tag").success).toBe(true);
  expect(component.safeParse("Tick").success).toBe(false);
});

it("keeps its hash while the entries stay the same", () => {
  const again = defineEntry({ ...stubTag, props: stubTag.props.clone() });

  expect(defineRegistry([stubPanel, again]).hash).toBe(baseline.hash);
});

const wider = tv({
  variants: { status: { paid: "", overdue: "", failed: "" } },
});

it.each([
  ["a use line", [{ ...stubTag, use: "A status." }, stubPanel]],
  [
    "a prop",
    [
      { ...stubTag, props: stubTag.props.extend({ title: z.string() }) },
      stubPanel,
    ],
  ],
  [
    "a variant in tv()",
    [
      {
        ...stubTag,
        props: stubTag.props.extend({ status: variantEnum(wider, "status") }),
      },
      stubPanel,
    ],
  ],
  ["a slot", [stubTag, { ...stubPanel, slots: { body: {} } }]],
  [
    "a slot's allow-list",
    [
      stubTag,
      {
        ...stubPanel,
        slots: { body: {}, actions: { allow: ["Tag", "Panel"] } },
      },
    ],
  ],
  ["a name", [{ ...stubTag, name: "StatusTag" }, stubPanel]],
  // Only the spec step's registry changes, and the code step's only by the
  // mark.
  ["a prop's code-only mark", [{ ...stubTag, codeOnly: ["label"] }, stubPanel]],
  // Only the code step's registry changes by the mark, and the spec step's
  // loses the entry.
  ["an entry's internal mark", [{ ...stubTag, internal: true }, stubPanel]],
])("changes its hash when %s changes", (_, changed) => {
  expect(defineRegistry(changed).hash).not.toBe(baseline.hash);
});

it("generates the wire schema's component enum from the registered names", () => {
  const { component } = baseline;

  expect(component.options).toEqual(["Panel", "Tag"]);
  expect(component.safeParse("Tag").success).toBe(true);
  expect(component.safeParse("Button").success).toBe(false);
});

it("refuses two entries with the same name", () => {
  expect(() =>
    defineRegistry([stubTag, stubPanel, { ...stubPanel, name: "Tag" }])
  ).toThrow(/"Tag" is registered twice/);
});
