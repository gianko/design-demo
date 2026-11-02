// A story on a phone, the contractor's usual device (ADR 0012). The gate
// renders a story tagged `phone` at `phoneViewport` in place of 1280×800,
// and `phoneGlobals` has Storybook show it at the same size, locked, so a
// reviewer sees the render the gate checks. A phone story carries both:
// `tags: ["phone"]` as a literal, since the gate reads tags from index.json
// and Storybook indexes them from the source without running it, and
// `globals: phoneGlobals`. ./phone.test.ts holds the two together.

export const phone = "phone";

export const phoneViewport = { width: 360, height: 800 };

// The viewport Storybook's toolbar offers under this name.
export const phoneViewportOption = {
  name: "Phone",
  styles: {
    width: `${phoneViewport.width}px`,
    height: `${phoneViewport.height}px`,
  },
  type: "mobile",
} as const;

export const phoneGlobals = { viewport: { value: phone, isRotated: false } };
