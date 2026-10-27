import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
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

// Style expectations (ADR 0012) every Toast holds: raised, with a shadow and
// no border; the surface radius and padding of its density; sticky at the
// end edge, as ActionBar is; and the view transition name of its tone (ADR
// 0011): ActionBar's for success, so the bar becomes the toast, and one of
// its own for failure, so it enters beside the bar. A one-line toast is one
// control tall plus 16px, the bar's height. Stories that start in a state
// with no toast check nothing here.
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

// The failed result: the overdue tint, saying what happened and what to do.
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
// the failure Toast right before the bar, which stays. In Storybook, Approve
// and pay settles after 1.8s under the story's fixture variant, so the bar
// becomes the toast, or the failure toast enters beside it.
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
      {state === "payment-failed" && <Toast tone="failure" text={failed} />}
      {(state === "rows-selected" || state === "payment-failed") && (
        <ActionBar>
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

// Where the bar and the toast sit: both end where the table does, so the
// toast lands where the bar was, and a toast beside the bar sits right above
// it.
async function endsWithTheTable(canvas: HTMLElement) {
  const table = find(canvas, "DataTable")!.getBoundingClientRect();
  for (const component of ["ActionBar", "Toast"]) {
    const box = find(canvas, component)?.getBoundingClientRect();
    if (box) await expect(box.right).toBe(table.right);
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
// and the selection, and the failure Toast enters on its own beside the bar.
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
// for a retry, and the failure Toast right above it, under a name of its own,
// so each name is unique in the snapshot.
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
    await expect(toast.getBoundingClientRect().bottom).toBeLessThan(
      bar.getBoundingClientRect().top
    );
  },
};
