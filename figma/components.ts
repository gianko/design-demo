// The library components figma:sync-components draws (ADR 0015), and what
// their tv() configs can't say: how each one's slots nest, how it turns its
// props into tv() props, and the sample copy in its text. #321 and #322 add
// the rest of the library here.

import { button } from "../src/components/Button/Button.tsx";
import { buttonEntry } from "../src/components/Button/Button.registry.ts";
import type { FrameSource, Styles } from "./frames.ts";

/** Each component's text, by the anatomy's text names. */
export const sampleCopy: Record<string, Record<string, string>> = {
  Button: { label: "Approve and pay" },
};

export const frameSources: FrameSource[] = [
  {
    entry: buttonEntry,
    styles: button as unknown as Styles,
    // Button drops pending while disabled (Button.tsx), so that pair ships
    // as the disabled look.
    render: (variant) => ({
      ...variant,
      pending: Boolean(variant.pending) && !variant.disabled,
    }),
    anatomy: ({ pending }) => ({
      slot: "root",
      children: [
        { text: "label" },
        pending === true && { slot: "edge", children: [{ slot: "sweep" }] },
      ],
    }),
    copy: sampleCopy.Button,
  },
];
