import { tv } from "tailwind-variants/lite";
import { expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defineEntry, type PropsOf, variantEnum } from "./entry.ts";

const button = tv({
  slots: { root: "", label: "" },
  variants: {
    intent: { primary: "", secondary: "", quiet: "" },
    pending: { true: "" },
  },
});

it("reads a variant's options from the component's tv() config", () => {
  const intent = variantEnum(button, "intent");

  expect(intent.options).toEqual(["primary", "secondary", "quiet"]);
  expect(intent.safeParse("secondary").success).toBe(true);
  expect(intent.safeParse("danger").success).toBe(false);
  expectTypeOf(intent.parse("quiet")).toEqualTypeOf<
    "primary" | "secondary" | "quiet"
  >();
});

it("refuses a boolean variant, which a z.boolean() prop describes", () => {
  expect(() => variantEnum(button, "pending")).toThrow(
    /"pending" is a boolean variant/
  );
});

it("types a component's props as z.infer of its entry", () => {
  const entry = defineEntry({
    name: "Button",
    use: "Starts an action.",
    props: z.object({
      intent: variantEnum(button, "intent"),
      label: z.string(),
      pending: z.boolean().optional(),
    }),
    slots: { icon: { allow: ["Icon"] } },
  });

  expectTypeOf<PropsOf<typeof entry>>().toEqualTypeOf<{
    intent: "primary" | "secondary" | "quiet";
    label: string;
    pending?: boolean | undefined;
  }>();
  expectTypeOf(entry.name).toEqualTypeOf<"Button">();
  expect(entry.props.parse({ intent: "quiet", label: "Pay" })).toEqual({
    intent: "quiet",
    label: "Pay",
  });
});
