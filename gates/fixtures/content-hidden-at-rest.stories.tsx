import type { Meta, StoryObj } from "@storybook/react-vite";

// content-hidden-at-rest (lint/taste/RULES.md), one way of staying hidden per
// failing story. Each hides an ancestor of the text, not the text's own
// element, and the opacity and clip cases get there through an animation
// that ends hidden, as a reveal run backwards or a stuck exit would. The
// animations are the Web Animations API's, so no raw value reaches a class
// or a style attribute. Opacity: a row fades out and stays out. Visibility:
// a tag under an `invisible` wrapper. Clip: a wipe that ends with the name
// clipped away, and a collapsed box whose overflow is hidden. Pass: a reveal
// that holds the text at opacity 0 for its delay and then fades it in, so
// the rule has to wait for it to settle; the same fade-out on copy marked
// `aria-hidden`; a visually hidden status region, as Screen renders one; a
// `hidden` note; and an idle loop that never settles, which the rule must
// not wait on.
type Variant = "pass" | "opacity" | "visibility" | "clip";

const animate =
  (keyframes: Keyframe[], options: KeyframeAnimationOptions) =>
  (element: HTMLElement | null) => {
    element?.animate(keyframes, options);
  };

const fadeOut = animate([{ opacity: 1 }, { opacity: 0 }], {
  duration: 240,
  fill: "forwards",
});

const meta = {
  title: "GateFixtures/ContentHiddenAtRest",
  args: { variant: "pass" },
  render: ({ variant }) => (
    <div className="flex flex-col items-start gap-sm bg-page p-page text-body text-ink">
      {variant === "opacity" && (
        <div ref={fadeOut}>
          <p>Northwind Logistics GmbH</p>
        </div>
      )}
      {variant === "visibility" && (
        <div className="invisible">
          <span className="text-label">Paid</span>
        </div>
      )}
      {variant === "clip" && (
        <>
          <div
            ref={animate(
              [{ clipPath: "inset(0)" }, { clipPath: "inset(0 100% 0 0)" }],
              { duration: 240, fill: "forwards" }
            )}
          >
            <p>Invoice 2024-0117</p>
          </div>
          <div className="h-0 overflow-hidden">
            <p>Due in 14 days</p>
          </div>
        </>
      )}
      {variant === "pass" && (
        <>
          <div
            ref={animate([{ opacity: 0 }, { opacity: 1 }], {
              delay: 1500,
              duration: 240,
              fill: "backwards",
            })}
          >
            <p>Northwind Logistics GmbH</p>
          </div>
          <span aria-hidden="true" ref={fadeOut}>
            Paid
          </span>
          <div role="status" className="sr-only">
            <p>Reminder sent to Northwind.</p>
          </div>
          <p hidden>Due in 14 days</p>
          <div aria-hidden="true" className="h-edge w-4xl overflow-hidden">
            <div className="h-full animate-progress-sweep bg-accent" />
          </div>
        </>
      )}
    </div>
  ),
} satisfies Meta<{ variant: Variant }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Opacity: StoryObj<typeof meta> = { args: { variant: "opacity" } };

export const Visibility: StoryObj<typeof meta> = {
  args: { variant: "visibility" },
};

export const Clip: StoryObj<typeof meta> = { args: { variant: "clip" } };
