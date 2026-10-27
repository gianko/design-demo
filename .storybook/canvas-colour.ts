// Colours as the browser paints them, for style expectations that compare
// colours (ADR 0012), read off a canvas that never joins the page.

/**
 * A colour as the canvas writes it, so a token's value as written and a
 * computed colour compare equal when they're the same colour. An unknown
 * value leaves the canvas's black.
 */
export function colour(value: string): string {
  const context = document.createElement("canvas").getContext("2d")!;
  context.fillStyle = value;
  return context.fillStyle;
}
