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
  expect(baseline.serialized).toMatchInlineSnapshot(`
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
  expect(defineRegistry([stubPanel, stubTag]).serialized).toBe(
    baseline.serialized
  );
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
