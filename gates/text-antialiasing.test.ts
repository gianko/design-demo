// Shots render text with greyscale antialiasing (gates/image.ts), so a glyph's
// edge pixels are blends of its ink and the surface under it. LCD
// antialiasing paints them in coloured subpixel fringes instead, which gate
// 5's judge once read as a tint on the text.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { repo } from "../repo.ts";
import { renders, shotName } from "./stories.ts";

type Rgb = [number, number, number];

// The RGB pixels of an 8-bit, non-interlaced RGB or RGBA PNG, as Playwright
// writes baselines.
function pixels(png: Buffer): Rgb[] {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const [depth, colourType, , , interlace] = png.subarray(24, 29);
  if (depth !== 8 || interlace !== 0 || ![2, 6].includes(colourType!)) {
    throw new Error(
      `unsupported PNG: depth ${depth}, colour type ${colourType}`
    );
  }
  const channels = colourType === 6 ? 4 : 3;
  const idat: Buffer[] = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    if (png.toString("latin1", at + 4, at + 8) === "IDAT") {
      idat.push(png.subarray(at + 8, at + 8 + length));
    }
    at += 12 + length;
  }
  const data = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows: Uint8Array[] = [];
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = data[y * (stride + 1)];
    const row = data.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? out[i - channels]! : 0;
      const up = previous[i]!;
      const upLeft = i >= channels ? previous[i - channels]! : 0;
      const predictor = [
        0,
        left,
        up,
        (left + up) >> 1,
        paeth(left, up, upLeft),
      ][filter!]!;
      out[i] = (row[i]! + predictor) & 0xff;
    }
    rows.push(out);
    previous = out;
  }
  return rows.flatMap((row) =>
    Array.from({ length: width }, (_, x): Rgb => {
      const i = x * channels;
      return [row[i]!, row[i + 1]!, row[i + 2]!];
    })
  );
}

function paeth(left: number, up: number, upLeft: number) {
  const p = left + up - upLeft;
  const [dl, du, dul] = [left, up, upLeft].map((v) => Math.abs(p - v));
  return dl! <= du! && dl! <= dul! ? left : du! <= dul! ? up : upLeft;
}

// How far `pixel` lies from the nearest blend of `ink` and `surface`.
function offBlend(pixel: Rgb, ink: Rgb, surface: Rgb) {
  const along = ink.map((v, i) => surface[i]! - v);
  const to = ink.map((v, i) => pixel[i]! - v);
  const length = along.reduce((sum, v) => sum + v * v, 0);
  const t = Math.min(
    1,
    Math.max(0, along.reduce((sum, v, i) => sum + v * to[i]!, 0) / length)
  );
  return Math.hypot(...ink.map((v, i) => pixel[i]! - (v + t * along[i]!)));
}

const distance = (a: Rgb, b: Rgb) => Math.hypot(...a.map((v, i) => v - b[i]!));

describe("text antialiasing", () => {
  // Text/Body: one line of body text on the page's neutral surface.
  for (const render of renders([{ id: "components-text--body", tags: [] }])) {
    it(`paints ${shotName(render)}'s glyph edges as blends of ink and surface, with no coloured fringes`, () => {
      const shot = pixels(
        readFileSync(join(repo, "gates/baselines", `${shotName(render)}.png`))
      );
      const counts = new Map<string, number>();
      for (const pixel of shot) {
        counts.set(String(pixel), (counts.get(String(pixel)) ?? 0) + 1);
      }
      const [surfaceKey] = [...counts].sort((a, b) => b[1] - a[1])[0]!;
      const surface = surfaceKey.split(",").map(Number) as Rgb;
      const ink = shot.reduce((far, pixel) =>
        distance(pixel, surface) > distance(far, surface) ? pixel : far
      );

      // Rounding each channel of a blend is off by a level or two; an LCD
      // fringe like (170, 88, 57) on dark ink and a light surface is ~90 off.
      const worst = shot.reduce((far, pixel) =>
        offBlend(pixel, ink, surface) > offBlend(far, ink, surface)
          ? pixel
          : far
      );
      expect(
        offBlend(worst, ink, surface),
        `(${worst.join(", ")}) is no blend of ink (${ink.join(", ")}) and surface (${surface.join(", ")})`
      ).toBeLessThanOrEqual(4);
    });
  }
});
