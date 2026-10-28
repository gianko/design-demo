import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { colour } from "../../../.storybook/canvas-colour.ts";
import { FocusedOn } from "../../../.storybook/focused-on.tsx";
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
// radius and padding of its density; the view transition name of its tone
// (ADR 0011); raised, with a shadow, and sticky at the end edge. A one-line
// toast is one control tall plus 16px. Stories that start in a state with no
// toast check nothing here.
async function holdsShapeAndName(canvas: HTMLElement, density: string) {
  const toast = find(canvas, "Toast");
  if (!toast) return;
  const style = getComputedStyle(toast);
  const contractor = density === "contractor";
  await expect(style.position).toBe("sticky");
  await expect(style.bottom).toBe("16px");
  await expect(style.boxShadow).not.toBe("none");
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

// The confirmed result: a raised surface, holding what was done.
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

// The pay confirmation (ADR 0013), wired as bulk-pay's generated screen
// wires it: the table of invoices with Approve and pay in its footer, and
// the success or the failure Toast after the table, in the state the
// payment enters. In Storybook, Approve and pay settles after 1.8s under the
// story's fixture variant, so the success toast enters, or the failure one.
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
        <Toast tone="success" text={scheduled} />
      )}
      {state === "payment-failed" && <Toast tone="failure" text={failed} />}
    </Stack>
  );
}

// Where a toast sits: it ends where the table does.
async function endsWithTheTable(canvas: HTMLElement) {
  const table = find(canvas, "DataTable")!.getBoundingClientRect();
  const toast = find(canvas, "Toast");
  if (toast) {
    await expect(toast.getBoundingClientRect().right).toBe(table.right);
  }
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

// Rows ticked, and the payment will be confirmed: Approve and pay brings in
// the success Toast.
export const ReadyToConfirm: Story = {
  args: Success.args,
  render: ticked("default"),
};

// Where ReadyToConfirm lands: the paid rows scheduled, none ticked, and the
// success Toast after the table.
export const Confirmed: Story = {
  args: Success.args,
  parameters: startIn("payment-scheduled", "invoice-queue/payment-scheduled"),
  render: () => <PayConfirmation />,
  play: async ({ canvasElement, globals }) => {
    await holdsShapeAndName(canvasElement, globals.density);
    await endsWithTheTable(canvasElement);
  },
};

// Rows ticked, and the payment will fail: Approve and pay keeps the
// selection, and the failure Toast enters on its own.
export const ReadyToFail: Story = {
  args: Failure.args,
  render: ticked("invoice-queue/payment-failed"),
};

// Where ReadyToFail lands: the rows still ticked for a retry, Approve and
// pay still enabled, and the failure Toast after the table.
export const Failed: Story = {
  args: Failure.args,
  parameters: startIn("payment-failed", "invoice-queue/payment-failed"),
  render: () => <PayConfirmation />,
  play: async ({ canvasElement, globals }) => {
    await holdsShapeAndName(canvasElement, globals.density);
    await endsWithTheTable(canvasElement);
    const pay = find(find(canvasElement, "DataTable")!, "Button")!;
    await expect((pay as HTMLButtonElement).disabled).toBe(false);
  },
};

// A Toast that focus lands on from script: it is no control, so it shows
// no focus ring.
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
