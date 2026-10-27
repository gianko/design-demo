import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { colour } from "../../../.storybook/canvas-colour.ts";
import { FocusedOn } from "../../../.storybook/focused-on.tsx";
import type { VariantName } from "../../fixtures/fixtures.ts";
import { ActionBar } from "../ActionBar/ActionBar.tsx";
import { Amount } from "../Amount/Amount.tsx";
import { Button } from "../Button/Button.tsx";
import { DataTable } from "../DataTable/DataTable.tsx";
import {
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

// Style expectations (ADR 0012) every Toast holds: no border; the surface
// radius and padding of its density; and the view transition name of its
// tone (ADR 0011): ActionBar's for success, so the bar becomes the toast,
// and one of its own for failure, so it enters while the bar stays. On its
// own it is raised, with a shadow, and sticky at the end edge, as ActionBar
// is; inside a bar (#243) the bar is the one floating surface, so the Toast
// neither sticks nor casts a shadow nor stacks on its own. A one-line toast
// is one control tall plus 16px, the bar's height. Stories that start in a
// state with no toast check nothing here.
async function holdsShapeAndName(canvas: HTMLElement, density: string) {
  const toast = find(canvas, "Toast");
  if (!toast) return;
  const style = getComputedStyle(toast);
  const contractor = density === "contractor";
  if (toast.closest('[data-component="ActionBar"]')) {
    await expect(style.position).not.toBe("sticky");
    await expect(style.boxShadow).toBe("none");
    await expect(style.zIndex).toBe("auto");
  } else {
    await expect(style.position).toBe("sticky");
    await expect(style.bottom).toBe("16px");
    await expect(style.boxShadow).not.toBe("none");
  }
  await expect(style.borderTopWidth).toBe("0px");
  await expect(style.borderTopLeftRadius).toBe(contractor ? "12px" : "8px");
  const side = contractor ? "24px" : "20px";
  await expect([
    style.paddingTop,
    style.paddingRight,
    style.paddingBottom,
    style.paddingLeft,
  ]).toEqual(["8px", side, "8px", side]);
  await expect(style.viewTransitionName).toBe(
    toast.dataset.tone === "success" ? "action-result" : "action-failure"
  );
  // Focusable from script only, so it never joins the tab order (#244).
  await expect(toast.tabIndex).toBe(-1);
  if (toast.dataset.tone === "failure") await holdsErrorColours(toast);
  await document.fonts.ready;
  const control = contractor ? 44 : 32;
  const text = toast.querySelector("p")!.getBoundingClientRect().height;
  // One line is shorter than a control; the text box is held to its height.
  if (text <= control) {
    await expect(text).toBe(control);
    await expect(toast.getBoundingClientRect().height).toBe(control + 16);
  }
}

const meta = {
  title: "Components/Toast",
  component: Toast,
  // Room for the raised shadow, which sits outside the toast.
  decorators: [
    (Story) => (
      <div className="p-sm">
        <Story />
      </div>
    ),
  ],
  play: ({ canvasElement, globals }) =>
    holdsShapeAndName(canvasElement, globals.density),
} satisfies Meta<typeof Toast>;

export default meta;

type Story = StoryObj<typeof meta>;

// The confirmed result: the bar's own raised surface, holding what was done.
export const Success: Story = { args: { tone: "success", text: scheduled } };

// The failed result: the error pair, saying what happened and what to do.
export const Failure: Story = { args: { tone: "failure", text: failed } };

// The failure on a phone: its copy wraps inside the toast, and the toast
// stays inside the screen.
export const Phone: Story = {
  args: Failure.args,
  tags: ["phone"],
  play: async ({ canvasElement, globals }) => {
    await holdsShapeAndName(canvasElement, globals.density);
    const toast = find(canvasElement, "Toast")!.getBoundingClientRect();
    await expect(toast.left).toBeGreaterThanOrEqual(0);
    await expect(toast.right).toBeLessThanOrEqual(window.innerWidth);
  },
};

// The pay confirmation (ADR 0011), wired as bulk-pay's generated screen
// wires it: the table of invoices; the bar while rows are selected and after
// a failure; the success Toast where the bar was, with the bar left out; and
// the failure Toast inside the bar, which stays, above its Button (#243). In
// Storybook, Approve and pay settles after 1.8s under the story's fixture
// variant, so the bar becomes the toast, or the failure toast enters in it.
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
        selectable
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
        <Toast tone="success" text={scheduled} />
      )}
      {(state === "rows-selected" || state === "payment-failed") && (
        <ActionBar>
          {state === "payment-failed" && <Toast tone="failure" text={failed} />}
          <Button
            intent="primary"
            text="Approve and pay"
            pending={pay.pending}
            onClick={() => pay.run(selected)}
          />
        </ActionBar>
      )}
    </Stack>
  );
}

// Where the bar and the toast sit: the bar, or a toast on its own, ends
// where the table does, so the toast lands where the bar was; a toast in the
// bar sits inside it.
async function endsWithTheTable(canvas: HTMLElement) {
  const table = find(canvas, "DataTable")!.getBoundingClientRect();
  const bar = find(canvas, "ActionBar");
  const outer = bar ?? find(canvas, "Toast");
  if (outer) {
    await expect(outer.getBoundingClientRect().right).toBe(table.right);
  }
}

const startIn = (name: string, fixture: VariantName) =>
  ({ screenState: { name, fixture } }) satisfies ScreenStateParameters;

// Rows selected, and the payment will be confirmed: Approve and pay morphs
// the bar into the success Toast through their shared name.
export const BarBecomesToast: Story = {
  args: Success.args,
  parameters: startIn("rows-selected", "invoice-queue/rows-selected"),
  render: () => <PayConfirmation />,
  play: async ({ canvasElement, globals }) => {
    await holdsShapeAndName(canvasElement, globals.density);
    await endsWithTheTable(canvasElement);
    await expect(
      getComputedStyle(find(canvasElement, "ActionBar")!).viewTransitionName
    ).toBe("action-result");
  },
};

// Where BarBecomesToast lands: the paid rows scheduled, the bar gone, and
// the success Toast in its place, carrying the name the bar had.
export const Confirmed: Story = {
  args: Success.args,
  parameters: startIn("payment-scheduled", "invoice-queue/payment-scheduled"),
  render: () => <PayConfirmation />,
  play: async ({ canvasElement, globals }) => {
    await holdsShapeAndName(canvasElement, globals.density);
    await endsWithTheTable(canvasElement);
    await expect(find(canvasElement, "ActionBar")).toBeNull();
    await expect(
      getComputedStyle(find(canvasElement, "Toast")!).viewTransitionName
    ).toBe("action-result");
  },
};

// Rows selected, and the payment will fail: Approve and pay keeps the bar
// and the selection, and the failure Toast enters on its own inside the bar.
// The name is from when the Toast sat beside the bar, kept so the story's
// baselines carry over; the Toast is inside the bar now (#243).
export const FailureBesideBar: Story = {
  args: Failure.args,
  parameters: startIn("rows-selected", "invoice-queue/payment-failed"),
  render: () => <PayConfirmation />,
  play: async ({ canvasElement, globals }) => {
    await holdsShapeAndName(canvasElement, globals.density);
    await endsWithTheTable(canvasElement);
  },
};

// Where FailureBesideBar lands: the rows still selected, the bar still there
// for a retry, and the failure Toast inside it, above its Button, under a
// name of its own, so each name is unique in the snapshot (#243).
export const Failed: Story = {
  args: Failure.args,
  parameters: startIn("payment-failed", "invoice-queue/payment-failed"),
  render: () => <PayConfirmation />,
  play: async ({ canvasElement, globals }) => {
    await holdsShapeAndName(canvasElement, globals.density);
    await endsWithTheTable(canvasElement);
    const bar = find(canvasElement, "ActionBar")!;
    const toast = find(canvasElement, "Toast")!;
    await expect(getComputedStyle(bar).viewTransitionName).toBe(
      "action-result"
    );
    await expect(getComputedStyle(toast).viewTransitionName).toBe(
      "action-failure"
    );
    await expect(bar.contains(toast)).toBe(true);
    const button = find(bar, "Button")!.getBoundingClientRect();
    await expect(toast.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      button.top
    );
  },
};

// Where Confirmed lands for a keyboard user who paid from the bar: focus on
// the success Toast the bar became, so their next Tab moves on from there.
// The toast is no control, so it shows no focus ring.
export const ConfirmedWithFocus: Story = {
  args: Success.args,
  parameters: startIn("payment-scheduled", "invoice-queue/payment-scheduled"),
  render: () => (
    <FocusedOn component="Toast">
      <PayConfirmation />
    </FocusedOn>
  ),
  play: async ({ canvasElement, globals }) => {
    await holdsShapeAndName(canvasElement, globals.density);
    const toast = find(canvasElement, "Toast")!;
    await expect(document.activeElement).toBe(toast);
    await expect(getComputedStyle(toast).outlineStyle).toBe("none");
  },
};
