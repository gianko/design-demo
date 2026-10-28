import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { colour } from "../../../.storybook/canvas-colour.ts";
import type { VariantName } from "../../fixtures/fixtures.ts";
import { Amount } from "../Amount/Amount.tsx";
import { Button } from "../Button/Button.tsx";
import { DataTable } from "../DataTable/DataTable.tsx";
import {
  ScreenHost,
  useAction,
  useFixtureData,
  useScreenState,
  useSelectedRows,
  type ScreenStateParameters,
} from "../Screen/screen-state.tsx";
import { Stack } from "../Stack/Stack.tsx";
import { StatusTag } from "../StatusTag/StatusTag.tsx";
import { Text } from "../Text/Text.tsx";
import { Toast } from "./Toast.tsx";

// bulk-pay's results, in the brief's copy rules: the success says what was
// done and when; the failure says what happened and what to do next.
const scheduled = "3 invoices scheduled for the Oct 24 run.";
const failed =
  "Payment not scheduled: the funding account is too low. Add funds, then approve and pay again.";
const closeLabel = "Close payment result";

const find = (canvas: HTMLElement, component: string) =>
  canvas.querySelector<HTMLElement>(`[data-component="${component}"]`);

// A failure Toast is the error pair (#241), not the overdue status tag's, so
// beside an Overdue tag it doesn't read as one more overdue thing.
async function holdsErrorColours(toast: HTMLElement) {
  const style = getComputedStyle(toast);
  const token = (name: string) =>
    colour(style.getPropertyValue(`--ds-color-${name}`));
  await expect(colour(style.backgroundColor)).toBe(token("bg-error"));
  await expect(colour(style.color)).toBe(token("text-error"));
  await expect(colour(style.backgroundColor)).not.toBe(token("bg-overdue"));
  await expect(colour(style.color)).not.toBe(token("text-overdue"));
}

// Style expectations (ADR 0012) every Toast holds (ADR 0013): fixed to the
// window's bottom end corner, the density's page padding in from both
// edges and stacked at `z-toast`; the measure wide, or the window's width
// within the page padding where that is narrower; no border; the surface
// radius and padding of its density, closer at the end, where its close
// button sits; raised, with a shadow; its own view transition name, and no
// focus of its own. A one-line toast is one control tall plus 16px. Stories
// that start in a state with no toast check nothing here.
async function holdsCorner(canvas: HTMLElement, density: string) {
  const toast = find(canvas, "Toast");
  if (!toast) return;
  const style = getComputedStyle(toast);
  const contractor = density === "contractor";
  const page = contractor ? 36 : 28;
  const measure = contractor ? 472 : 412;
  const corner = getComputedStyle(toast.parentElement!);
  await expect(corner.position).toBe("fixed");
  await expect(corner.zIndex).toBe("200");
  const box = toast.getBoundingClientRect();
  const { clientWidth, clientHeight } = document.documentElement;
  await expect(box.right).toBe(clientWidth - page);
  await expect(box.bottom).toBe(clientHeight - page);
  await expect(box.width).toBe(Math.min(measure, clientWidth - 2 * page));
  await expect(style.boxShadow).not.toBe("none");
  await expect(style.borderTopWidth).toBe("0px");
  await expect(style.borderTopLeftRadius).toBe(contractor ? "12px" : "8px");
  const side = contractor ? "24px" : "20px";
  await expect([
    style.paddingTop,
    style.paddingRight,
    style.paddingBottom,
    style.paddingLeft,
  ]).toEqual(["8px", "8px", "8px", side]);
  await expect(style.viewTransitionName).toBe("toast");
  await expect(toast.hasAttribute("tabindex")).toBe(false);
  const close = find(toast, "IconButton")!;
  await expect(close.textContent).toBe(closeLabel);
  if (toast.dataset.tone === "failure") await holdsErrorColours(toast);
  await document.fonts.ready;
  const control = contractor ? 44 : 32;
  const text = toast.querySelector("p")!.getBoundingClientRect().height;
  // One line is shorter than a control; the text box is held to its height.
  if (text <= control) {
    await expect(text).toBe(control);
    await expect(box.height).toBe(control + 16);
  }
}

const meta = {
  title: "Components/Toast",
  component: Toast,
  args: { closeLabel },
  // The window's height, so the corner the toast is fixed to lies inside
  // the story's root, which the gate shoots.
  decorators: [
    (Story) => (
      <div className="min-h-dvh">
        <Story />
      </div>
    ),
  ],
  play: ({ canvasElement, globals }) =>
    holdsCorner(canvasElement, globals.density),
} satisfies Meta<typeof Toast>;

export default meta;

type Story = StoryObj<typeof meta>;

// The confirmed result: a raised surface in the corner, holding what was
// done.
export const Success: Story = {
  args: { tone: "success", text: scheduled, closeLabel },
};

// The failed result: the error pair, saying what happened and what to do.
export const Failure: Story = {
  args: { tone: "failure", text: failed, closeLabel },
};

// On a phone the toast spans the window within the page padding, at the
// bottom, its copy wrapping inside it.
const spansThePhone = async (canvas: HTMLElement, density: string) => {
  await holdsCorner(canvas, density);
  const page = density === "contractor" ? 36 : 28;
  const box = find(canvas, "Toast")!.getBoundingClientRect();
  await expect(box.left).toBe(page);
};

export const Phone: Story = {
  args: Failure.args,
  tags: ["phone"],
  play: ({ canvasElement, globals }) =>
    spansThePhone(canvasElement, globals.density),
};

export const SuccessPhone: Story = {
  args: Success.args,
  tags: ["phone"],
  play: ({ canvasElement, globals }) =>
    spansThePhone(canvasElement, globals.density),
};

// Long copy wraps within the measure: the toast stays the measure wide and
// grows taller, its close button at the top.
export const LongCopy: Story = {
  args: {
    tone: "failure",
    text: "Payment not scheduled: the funding account ending 4417 doesn't cover this run's total. Add funds to it or untick some invoices, then approve and pay again before the Oct 24 cut-off.",
    closeLabel,
  },
  play: async ({ canvasElement, globals }) => {
    await holdsCorner(canvasElement, globals.density);
    const toast = find(canvasElement, "Toast")!;
    const control = globals.density === "contractor" ? 44 : 32;
    const text = toast.querySelector("p")!.getBoundingClientRect();
    await expect(text.height).toBeGreaterThan(control);
    const close = find(toast, "IconButton")!.getBoundingClientRect();
    await expect(close.top).toBe(text.top);
  },
};

// The pay confirmation (ADR 0013), wired as bulk-pay's generated screen
// wires it: the table of invoices with Approve and pay in its footer, and
// the success or the failure Toast after the table, in the state the
// payment enters. In Storybook, Approve and pay settles after 1.8s under the
// story's fixture variant, so the success toast slides in, or the failure
// one; the success toast leaves again after the `toast` duration.
function PayConfirmation() {
  const data = useFixtureData();
  const { state } = useScreenState();
  const selected = useSelectedRows();
  const pay = useAction("payInvoices", {
    success: "payment-scheduled",
    failure: "payment-failed",
  });
  return (
    <Stack gap="xs">
      <DataTable
        selectionText={{
          none: "No invoices selected",
          one: "1 invoice selected",
          other: "{count} invoices selected",
        }}
        actions={
          <Button
            intent="primary"
            text="Approve and pay"
            pending={pay.pending}
            onClick={() => pay.run(selected)}
          />
        }
        rows={data.invoices}
        columns={["Invoice", "Contractor", "Amount", "Due", "Status"]}
        cell={(row) => (
          <>
            <Text text={row.number} />
            <Text text={row.contractor} />
            <Amount
              value={row.amount}
              currency={row.currency}
              display="table"
            />
            <Text text={row.dueLabel} />
            <StatusTag status={row.status} />
          </>
        )}
      />
      {state === "payment-scheduled" && (
        <Toast tone="success" text={scheduled} closeLabel={closeLabel} />
      )}
      {state === "payment-failed" && (
        <Toast tone="failure" text={failed} closeLabel={closeLabel} />
      )}
    </Stack>
  );
}

const startIn = (name: string, fixture: VariantName) =>
  ({ screenState: { name, fixture } }) satisfies ScreenStateParameters;

// The three invoices awaiting approval, ticked in the default state, as the
// admin leaves them before Approve and pay, the payment settling under
// `fixture`.
const ticked = (fixture: VariantName) => () => (
  <ScreenHost
    screenState={{ name: "default", fixture }}
    selected={["INV-0147", "INV-0148", "INV-0149"]}
  >
    <PayConfirmation />
  </ScreenHost>
);

// Rows ticked, and the payment will be confirmed: Approve and pay slides in
// the success Toast, which leaves on its own.
export const ReadyToConfirm: Story = {
  args: Success.args,
  render: ticked("default"),
};

// Where ReadyToConfirm lands: the paid rows scheduled, none ticked, and the
// success Toast in the corner, its timer held, as the state's still render.
export const Confirmed: Story = {
  args: Success.args,
  parameters: startIn("payment-scheduled", "invoice-queue/payment-scheduled"),
  render: () => <PayConfirmation />,
};

// Rows ticked, and the payment will fail: Approve and pay keeps the
// selection, and the failure Toast slides in and stays.
export const ReadyToFail: Story = {
  args: Failure.args,
  render: ticked("invoice-queue/payment-failed"),
};

// Where ReadyToFail lands: the rows still ticked for a retry, Approve and
// pay still enabled, and the failure Toast in the corner.
export const Failed: Story = {
  args: Failure.args,
  parameters: startIn("payment-failed", "invoice-queue/payment-failed"),
  render: () => <PayConfirmation />,
  play: async ({ canvasElement, globals }) => {
    await holdsCorner(canvasElement, globals.density);
    const pay = find(find(canvasElement, "DataTable")!, "Button")!;
    await expect((pay as HTMLButtonElement).disabled).toBe(false);
  },
};
