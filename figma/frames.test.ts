// @vitest-environment node

import { tv } from "tailwind-variants/lite";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { defineEntry, variantEnum } from "../src/registry/entry.ts";
import { framesPayload, readTokens, type Tokens } from "./frames.ts";

let tokens: Tokens;
beforeAll(async () => {
  tokens = await readTokens();
});

// A stand-in component whose tone=loud puts `loud` on its mark slot, through
// a compound variant: the least obvious place a class can come from.
function probe(loud: string, root = "inline-flex bg-surface") {
  const styles = tv({
    slots: { root, mark: "absolute" },
    variants: { tone: { plain: {}, loud: {} } },
    compoundVariants: [{ tone: "loud", class: { mark: loud } }],
  });
  const entry = defineEntry({
    name: "Probe",
    use: "A stand-in.",
    props: z.object({ tone: variantEnum(styles, "tone") }),
  });
  return {
    entry,
    styles,
    anatomy: () => ({ slot: "root", children: [{ slot: "mark" }] }),
  };
}

describe("generating the frames", () => {
  it("fails on a class it can't map, naming the component, slot and class", () => {
    expect(() => framesPayload([probe("blur-sm")], tokens)).toThrow(
      "Probe (tone=loud): the mark slot's class blur-sm has no Figma mapping"
    );
  });

  it("skips a class behind a pseudo-state prefix, so frames show the rest state", () => {
    expect(() =>
      framesPayload(
        [probe("hover:blur-sm active:blur-sm focus-visible:blur-sm")],
        tokens
      )
    ).not.toThrow();
  });

  it("binds a gap class to the auto layout's item spacing", () => {
    const [set] = framesPayload(
      [probe("", "inline-flex gap-2xs px-surface")],
      tokens
    ).sets;

    expect(set!.variants[0]!.bind).toEqual({
      itemSpacing: "space/2xs",
      paddingLeft: "density/padding/surface",
      paddingRight: "density/padding/surface",
    });
  });

  it("takes a motion-reduce: class over the one it overrides, since a frame is still", () => {
    const [set] = framesPayload(
      [probe("w-0 motion-reduce:w-1/3 motion-reduce:animate-none")],
      tokens
    ).sets;

    const mark = set!.variants[1]!.children![0]!;
    expect(mark.type === "FRAME" && mark.place?.x).toMatchObject({
      constraint: "SCALE",
      size: 1 / 3,
    });
  });

  it("fails on two classes that set the same thing, naming both", () => {
    expect(() =>
      framesPayload([probe("", "inline-flex bg-surface bg-accent")], tokens)
    ).toThrow(
      "Probe (tone=plain): the root slot's classes bg-surface and bg-accent both set fills"
    );
  });

  it("fails on a slot no variant draws, unless it says why", () => {
    const source = probe("");
    const hidden = { ...source, anatomy: () => ({ slot: "root" }) };

    expect(() => framesPayload([hidden], tokens)).toThrow(
      "Probe: no variant draws the mark slot"
    );
    expect(() =>
      framesPayload([{ ...hidden, notDrawn: { mark: "a stand-in" } }], tokens)
    ).not.toThrow();
  });

  it("binds a vector's currentColor to the colour above it, and leaves any other paint literal", () => {
    const source = probe("", "inline-flex bg-surface text-ink");
    const [set] = framesPayload(
      [
        {
          ...source,
          anatomy: () => ({
            slot: "root",
            children: [
              {
                slot: "mark",
                children: [
                  {
                    vector: "glyph",
                    svg: '<svg width="16" height="16" fill="currentColor" stroke="#000"><path d="M0 0h16"></path></svg>',
                  },
                ],
              },
            ],
          }),
        },
      ],
      tokens
    ).sets;

    const mark = set!.variants[0]!.children![0]!;
    expect(mark.type === "FRAME" && mark.children).toEqual([
      {
        type: "VECTOR",
        name: "glyph",
        svg: expect.stringContaining("<svg"),
        fills: ["color/text/ink"],
      },
    ]);
  });

  it("draws a root that fills what holds it at its max width", () => {
    const [set] = framesPayload(
      [probe("", "flex w-full max-w-measure")],
      tokens
    ).sets;

    expect(set!.variants[0]!.bind).toEqual({
      width: "density/max-width/measure",
    });
    expect(() => framesPayload([probe("", "flex w-full")], tokens)).toThrow(
      "Probe (tone=plain): the root slot fills what holds it, and has no max-* class to draw it at"
    );
  });
});
