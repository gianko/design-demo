// Paints CSS colours in Chromium and prints the 8-bit sRGB each one comes out
// as, read from a screenshot's pixels. It runs only inside the pinned
// Playwright image (ADR 0009), started there by tokens/paint.ts, so the values
// are what `pnpm gate` renders. Usage: node tokens/paint-in-image.ts '<JSON
// array of CSS colours>'; it prints a JSON object of colour → [r, g, b].

import { chromium } from "@playwright/test";

const colors: string[] = JSON.parse(process.argv[2] ?? "[]");
// Each colour fills a tile this many px square, so its centre pixel is far
// from any edge a neighbour could bleed into.
const tile = 8;
const perRow = 16;

const browser = await chromium.launch({
  // As gates/playwright.config.ts launches it, so a tile rasters as a gate
  // shot's fill does.
  args: ["--disable-partial-raster"],
});
try {
  const page = await browser.newPage({
    viewport: { width: tile * perRow, height: 600 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<body style="margin:0;display:grid;grid-template-columns:repeat(${perRow},${tile}px);grid-auto-rows:${tile}px">${colors
      .map((color) => `<div style="background:${color}"></div>`)
      .join("")}</body>`
  );
  const rows = Math.max(1, Math.ceil(colors.length / perRow));
  const png = await page.screenshot({
    clip: { x: 0, y: 0, width: tile * perRow, height: tile * rows },
    fullPage: true,
  });
  // The screenshot is decoded in the page, untouched by colour management,
  // so the bytes read are the bytes painted.
  const pixels: number[][] = await page.evaluate(
    async ({ data, count, tile, perRow }) => {
      const blob = await (await fetch(`data:image/png;base64,${data}`)).blob();
      const bitmap = await createImageBitmap(blob, {
        colorSpaceConversion: "none",
        premultiplyAlpha: "none",
      });
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      return Array.from({ length: count }, (_, index) => {
        const x = (index % perRow) * tile + tile / 2;
        const y = Math.floor(index / perRow) * tile + tile / 2;
        return Array.from(context.getImageData(x, y, 1, 1).data.slice(0, 3));
      });
    },
    { data: png.toString("base64"), count: colors.length, tile, perRow }
  );
  process.stdout.write(
    JSON.stringify(
      Object.fromEntries(colors.map((color, index) => [color, pixels[index]]))
    )
  );
} finally {
  await browser.close();
}
