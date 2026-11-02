import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useRef } from "react";
import { expect, waitFor } from "storybook/test";
import { colour } from "../../../.storybook/canvas-colour.ts";
import { FocusedOn } from "../../../.storybook/focused-on.tsx";
import type { VariantName } from "../../fixtures/fixtures.ts";
import { Amount } from "../Amount/Amount.tsx";
import { Button } from "../Button/Button.tsx";
import { Card } from "../Card/Card.tsx";
import { Heading } from "../Heading/Heading.tsx";
import {
  useAction,
  useFixtureData,
  useScreenState,
  type ScreenStateParameters,
} from "../Screen/screen-state.tsx";
import { Stack } from "../Stack/Stack.tsx";
import { StatusTag } from "../StatusTag/StatusTag.tsx";
import { Text } from "../Text/Text.tsx";
import { Notice, type NoticeProps } from "./Notice.tsx";
import { registryDocs } from "../../../.storybook/registry-docs.tsx";
import { noticeEntry } from "./Notice.registry.ts";

// payment-status's results, in the brief's copy rules: the success says
// what was done and what happens next; the failure says what happened and
// what to do.
const sent = "Reminder sent to Northwind. We'll tell you when they pay.";
const failed =
  "We couldn't send your reminder. Check your connection and try again.";

const find = (canvas: HTMLElement, component: string) =>
  canvas.querySelector<HTMLElement>(`[data-component="${component}"]`);

const token = (style: CSSStyleDeclaration, name: string) =>
  colour(style.getPropertyValue(`--ds-color-${name}`));

// Style expectations (ADR 0012) every Notice holds (ADR 0016): the Card's
// full inner width along its bottom edge, outside its padding, under a
// `line` hairline, its bottom corners the surface radius; its sides the
// Card's padding, so the copy lines up with the content above; the glyph
// the density's icon size, centred on the first line; focusable from script
// only, with no role; and the Card around it named for the transition.
async function holdsEdge(canvas: HTMLElement, density: string) {
  const notice = find(canvas, "Notice");
  if (!notice) return;
  const contractor = density === "contractor";
  const card = find(canvas, "Card")!;
  const style = getComputedStyle(notice);
  const box = notice.getBoundingClientRect();
  const frame = card.getBoundingClientRect();
  await expect(box.left).toBe(frame.left + 1);
  await expect(box.right).toBe(frame.right - 1);
  await expect(box.bottom).toBe(frame.bottom - 1);
  const hairline = getComputedStyle(notice.parentElement!);
  await expect(hairline.borderTopWidth).toBe("1px");
  await expect(colour(hairline.borderTopColor)).toBe(
    token(hairline, "border-line")
  );
  const radius = contractor ? "12px" : "8px";
  await expect(style.borderBottomLeftRadius).toBe(radius);
  await expect(style.borderBottomRightRadius).toBe(radius);
  await expect(style.borderTopLeftRadius).toBe("0px");
  const side = contractor ? "24px" : "20px";
  await expect([
    style.paddingTop,
    style.paddingRight,
    style.paddingBottom,
    style.paddingLeft,
  ]).toEqual(["16px", side, "16px", side]);
  const glyph = notice.querySelector("svg")!.getBoundingClientRect();
  const icon = contractor ? 20 : 16;
  await expect([glyph.width, glyph.height]).toEqual([icon, icon]);
  await document.fonts.ready;
  const line = parseFloat(getComputedStyle(notice).lineHeight);
  const copy = notice.querySelector("p")!.getBoundingClientRect();
  await expect(glyph.top - copy.top).toBe((line - icon) / 2);
  await expect(notice.tabIndex).toBe(-1);
  await expect(notice.hasAttribute("role")).toBe(false);
  await expect(getComputedStyle(card).viewTransitionName).toBe("card-result");
  if (notice.dataset.tone === "failure") {
    // The inline error pair (#359), not the Toast's error pair nor the
    // overdue tag's beside it.
    await expect(colour(style.backgroundColor)).toBe(
      token(style, "bg-error-inline")
    );
    await expect(colour(style.color)).toBe(token(style, "text-error-inline"));
    await expect(colour(style.backgroundColor)).not.toBe(
      token(style, "bg-error")
    );
    await expect(colour(style.backgroundColor)).not.toBe(
      token(style, "bg-overdue")
    );
  } else {
    await expect(colour(style.backgroundColor)).toBe(
      token(style, "bg-surface-raised")
    );
    await expect(colour(style.color)).toBe(token(style, "text-ink"));
  }
}

// The footer's Stack stretches its Button to the Card's content width,
// with a Notice under it or without one (the prototype's first cut shrank
// it).
async function holdsFullWidthButton(canvas: HTMLElement, density: string) {
  const button = find(canvas, "Button");
  if (!button) return;
  const padding = density === "contractor" ? 24 : 20;
  const frame = find(canvas, "Card")!.getBoundingClientRect();
  await expect(button.getBoundingClientRect().width).toBe(
    frame.width - 2 - 2 * padding
  );
}

// The focus ring sits outside the Notice's and the footer Button's boxes,
// at the strip's and the footer's edge, so at rest nothing between each of
// them and the Card, the Card included, clips its overflow or paint. (Only
// a running transition's group clips, src/styles.css.)
async function leavesRingsUnclipped(canvas: HTMLElement) {
  const card = find(canvas, "Card")!;
  for (const ringed of [find(canvas, "Notice"), find(canvas, "Button")]) {
    if (!ringed) continue;
    for (let at = ringed.parentElement; at; at = at.parentElement) {
      const style = getComputedStyle(at);
      const clips = [style.overflowX, style.overflowY].filter(
        (overflow) => overflow !== "visible"
      );
      await expect(clips, ringed.dataset.component).toEqual([]);
      await expect(style.contain, ringed.dataset.component).not.toMatch(
        /paint|strict|content/
      );
      if (at === card) break;
    }
  }
}

const holds = async (canvas: HTMLElement, density: string) => {
  await holdsEdge(canvas, density);
  await holdsFullWidthButton(canvas, density);
  await leavesRingsUnclipped(canvas);
};

// payment-status as ADR 0016 wires it: the overdue invoice's Card, Send
// reminder in its footer while it can be sent, and the result in its
// `result` slot, in the state the action enters. In Storybook, Send
// reminder settles after 1.8s under the story's fixture variant.
function PaymentStatusCard() {
  const { overdueInvoice: invoice } = useFixtureData();
  const { state } = useScreenState();
  const sendReminder = useAction("sendReminder", {
    success: "reminder-sent",
    failure: "reminder-failed",
  });
  if (!invoice) return null;
  return (
    <Card
      header={
        <Stack direction="row" justify="between" gap="xs">
          <Heading level={2} text={invoice.number} />
          <StatusTag status={invoice.status} />
        </Stack>
      }
      footer={
        (state === "default" || state === "reminder-failed") && (
          <Stack direction="column" gap="xs">
            <Button
              text="Send reminder"
              intent="primary"
              pending={sendReminder.pending}
              onClick={() => sendReminder.run(invoice.id)}
            />
          </Stack>
        )
      }
      result={
        state === "reminder-sent" ? (
          <Notice tone="success" text={sent} />
        ) : state === "reminder-failed" ? (
          <Notice tone="failure" text={failed} />
        ) : undefined
      }
    >
      <Stack direction="column" gap="xs">
        <Amount
          value={invoice.amount}
          currency={invoice.currency}
          display="card"
        />
        <Text text={`Due ${invoice.dueLabel}`} />
        <Text text={invoice.client} tone="muted" />
      </Stack>
    </Card>
  );
}

const startIn = (name: string, fixture: VariantName) =>
  ({ screenState: { name, fixture } }) satisfies ScreenStateParameters;

const meta = {
  title: "Components/Notice",
  tags: ["autodocs"],
  ...registryDocs(noticeEntry),
  component: Notice,
  render: () => <PaymentStatusCard />,
  play: ({ canvasElement, globals }) => holds(canvasElement, globals.density),
} satisfies Meta<typeof Notice>;

export default meta;

type Story = StoryObj<typeof meta>;

const success: NoticeProps = { tone: "success", text: sent };
const failure: NoticeProps = { tone: "failure", text: failed };

// The confirmed result: the raised surface along the Card's bottom edge,
// Send reminder gone.
export const Success: Story = {
  args: success,
  parameters: startIn("reminder-sent", "payment-status/reminder-sent"),
};

// The failed result: the inline error pair, Send reminder kept above it
// for a retry, at the Card's content width.
export const Failure: Story = {
  args: failure,
  parameters: startIn("reminder-failed", "payment-status/reminder-failed"),
};

// Before Send reminder: no Notice, and the Card as it always looks. Send
// reminder is confirmed, so the Card grows and the success strip is
// uncovered.
export const ReadyToSend: Story = {
  args: success,
  parameters: startIn("default", "payment-status/reminder-sent"),
};

// Before Send reminder, which fails: the Card grows and the failure strip
// is uncovered under the Button it keeps.
export const ReadyToFail: Story = {
  args: failure,
  parameters: startIn("default", "payment-status/reminder-failed"),
};

// A person retrying Send reminder after it failed: a real click on the
// Button, dispatched in the first commit, so the story shows the Card's own
// retry path, its View Transition included, without its play function
// touching the page (ADR 0012).
function RetriesSend() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref
      .current!.querySelector<HTMLButtonElement>('[data-component="Button"]')!
      .click();
  }, []);
  return (
    <div ref={ref}>
      <PaymentStatusCard />
    </div>
  );
}

// A retry after a failure, which succeeds: the failure Notice stays as it
// is while Send reminder is pending, then changes tone in place, colours
// and glyph, as the Button leaves. The rest shot is the Card once the retry
// has settled: the success tone, after a failure.
export const RetrySucceeds: Story = {
  args: success,
  parameters: startIn("reminder-failed", "default"),
  render: () => <RetriesSend />,
  play: async ({ canvasElement, globals }) => {
    const notice = find(canvasElement, "Notice")!;
    await expect(notice.dataset.tone).toBe("failure");
    await expect(find(canvasElement, "Button")!.ariaBusy).toBe("true");
    await waitFor(
      () => {
        if (find(canvasElement, "Button")) {
          throw new Error("Send reminder hasn't settled yet.");
        }
        if (document.documentElement.matches(":active-view-transition")) {
          throw new Error("The retry's View Transition is still running.");
        }
      },
      { timeout: 5000 }
    );
    // The same element, now the success tone.
    await expect(find(canvasElement, "Notice")).toBe(notice);
    await expect(notice.dataset.tone).toBe("success");
    await holds(canvasElement, globals.density);
  },
};

// On a phone, a contractor's usual device: the copy wraps inside the strip
// and the glyph stays on its first line.
export const Phone: Story = {
  args: failure,
  tags: ["phone"],
  parameters: Failure.parameters,
};

export const SuccessPhone: Story = {
  args: success,
  tags: ["phone"],
  parameters: Success.parameters,
};

// Focus as the library leaves it when a confirmed result removes the
// focused Send reminder (ADR 0016): on the Notice, showing the ring, which
// sits outside the Card's frame and isn't clipped. Inset from the story's
// edge, so the shot holds the whole ring.
export const FocusedAfterSend: Story = {
  args: success,
  parameters: Success.parameters,
  render: () => (
    <div className="p-2xs">
      <FocusedOn component="Notice">
        <PaymentStatusCard />
      </FocusedOn>
    </div>
  ),
  play: async ({ canvasElement, globals }) => {
    await holds(canvasElement, globals.density);
    const notice = find(canvasElement, "Notice")!;
    await expect(document.activeElement).toBe(notice);
    await expect(getComputedStyle(notice).outlineStyle).toBe("solid");
  },
};
