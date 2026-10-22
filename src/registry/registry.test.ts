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
  props: z.object({ title: z.string().optional() }),
  slots: { body: {}, actions: { allow: ["Tag"] } },
});

it("serializes names, use lines, JSON Schema props and slots", () => {
  expect(defineRegistry([stubTag, stubPanel]).serialized)
    .toMatchInlineSnapshot(`
    "[
      {
        "name": "Panel",
        "use": "Groups related content on a surface.",
        "props": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string"
            }
          }
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
          ]
        },
        "slots": {}
      }
    ]"
  `);
});

it("serializes the same entries the same way in any order", () => {
  expect(defineRegistry([stubPanel, stubTag]).serialized).toBe(
    defineRegistry([stubTag, stubPanel]).serialized
  );
});

it("keeps its hash while the entries stay the same", () => {
  const again = defineEntry({ ...stubTag, props: stubTag.props.clone() });

  expect(defineRegistry([again, stubPanel]).hash).toBe(
    defineRegistry([stubPanel, stubTag]).hash
  );
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
  expect(defineRegistry(changed).hash).not.toBe(
    defineRegistry([stubTag, stubPanel]).hash
  );
});

it("generates the wire schema's component enum from the registered names", () => {
  const { component } = defineRegistry([stubTag, stubPanel]);

  expect(component.options).toEqual(["Panel", "Tag"]);
  expect(component.safeParse("Tag").success).toBe(true);
  expect(component.safeParse("Button").success).toBe(false);
});

it("refuses two entries with the same name", () => {
  expect(() =>
    defineRegistry([stubTag, { ...stubPanel, name: "Tag" }])
  ).toThrow(/"Tag" is registered twice/);
});
