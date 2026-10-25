import type { ReactNode } from "react";
import { tv } from "tailwind-variants/lite";
import { expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defineEntry, type PropsOf, specProps, variantEnum } from "./entry.ts";

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

const pendingButton = {
  name: "Button",
  use: "Starts an action.",
  props: z.object({ label: z.string(), pending: z.boolean().optional() }),
};

it("keeps a code-only prop in the component's props type", () => {
  const entry = defineEntry({ ...pendingButton, codeOnly: ["pending"] });

  expectTypeOf<PropsOf<typeof entry>>().toEqualTypeOf<{
    label: string;
    pending?: boolean | undefined;
  }>();
  expect(entry.props.parse({ label: "Pay", pending: true })).toEqual({
    label: "Pay",
    pending: true,
  });
});

it("refuses to mark a prop code-only that the entry doesn't have", () => {
  expect(() =>
    // @ts-expect-error: "pendng" isn't one of the entry's props.
    defineEntry({ ...pendingButton, codeOnly: ["pendng"] })
  ).toThrow(/Button marks "pendng" code-only, but has no such prop/);
});

// A cross-prop rule, as a top-level refine. Zod 4 can't omit() a prop from a
// refined object, so a refined entry can't hide one from the spec step.
const refinedProps = z
  .object({ label: z.string(), pending: z.boolean().optional() })
  .refine(({ label }) => label !== "", { message: "label is empty" });

it("gives a UI spec node all of a refined entry's props when none is code-only", () => {
  const entry = defineEntry({ ...pendingButton, props: refinedProps });

  const props = specProps(entry);
  expect(Object.keys(props.shape)).toEqual(["label", "pending"]);
  expect(props.safeParse({ label: "" }).success).toBe(false);
});

it("refuses a code-only prop on an entry whose props are refined", () => {
  expect(() =>
    defineEntry({
      ...pendingButton,
      props: refinedProps,
      codeOnly: ["pending"],
    })
  ).toThrow(
    /Button marks "pending" code-only, but its props have a refinement/
  );
});

it("leaves a code-only prop out of what a UI spec node may give", () => {
  const entry = defineEntry({ ...pendingButton, codeOnly: ["pending"] });

  expect(Object.keys(specProps(entry).shape)).toEqual(["label"]);
});

it("types an entry with no props of its own as an empty object, so slot props can join it", () => {
  const entry = defineEntry({
    name: "Card",
    use: "Groups the facts about one thing.",
    props: z.object({}),
    slots: { header: {} },
  });

  expectTypeOf<PropsOf<typeof entry>>().toEqualTypeOf<Record<never, never>>();
  expectTypeOf<{ header: ReactNode }>().toExtend<
    PropsOf<typeof entry> & { header?: ReactNode }
  >();
  expect(entry.props.parse({})).toEqual({});
});
