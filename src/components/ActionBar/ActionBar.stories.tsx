import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Amount } from "../Amount/Amount.tsx";
import { Button } from "../Button/Button.tsx";
import { DataTable } from "../DataTable/DataTable.tsx";
import {
  useFixtureData,
  type ScreenStateParameters,
} from "../Screen/screen-state.tsx";
import { Stack } from "../Stack/Stack.tsx";
import { StatusTag } from "../StatusTag/StatusTag.tsx";
import { Text } from "../Text/Text.tsx";
import { Toast } from "../Toast/Toast.tsx";
import { ActionBar } from "./ActionBar.tsx";

const bar = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>('[data-component="ActionBar"]')!;

// Style expectations (ADR 0012) every story holds: the view transition name
// Toast shares (ADR 0011); sticky, so it floats above the window's edge once
// the table it follows runs past it; one 8px step around its Buttons, so the
// bar is one control tall plus 16px; and raised, with a shadow and no border.
async function holdsNameStickinessAndHeight(
  canvas: HTMLElement,
  density: string
) {
  const style = getComputedStyle(bar(canvas));
  await expect(style.viewTransitionName).toBe("action-result");
  await expect(style.position).toBe("sticky");
  await expect(style.bottom).toBe("16px");
  await expect([
    style.paddingTop,
    style.paddingRight,
    style.paddingBottom,
    style.paddingLeft,
  ]).toEqual(["8px", "8px", "8px", "8px"]);
  await expect(style.boxShadow).not.toBe("none");
  await expect(style.borderTopWidth).toBe("0px");
  const control = density === "contractor" ? 44 : 32;
  const button = bar(canvas).querySelector('[data-component="Button"]')!;
  await expect(button.getBoundingClientRect().height).toBe(control);
  // A single row of Buttons and nothing above it; Phone checks the wrap,
  // and the failure stories the Toast's row, on their own.
  if (
    bar(canvas).querySelectorAll('[data-component="Button"]').length === 1 &&
    !bar(canvas).querySelector('[data-component="Toast"]')
  ) {
    await expect(bar(canvas).getBoundingClientRect().height).toBe(control + 16);
  }
}

// Style expectations (ADR 0012) of a bar holding a failure Toast (#243): the
// Toast is the bar's first row, across its width inside its padding, and
// every Button sits below it, inside the bar, with no overlap. The bar is
// the one floating surface, so the Toast neither sticks nor casts a shadow
// nor stacks on its own; it keeps its failure name, so it enters on its own
// while the bar stays.
async function holdsToastAboveButtons(canvas: HTMLElement) {
  const edge = bar(canvas).getBoundingClientRect();
  const toast = bar(canvas).querySelector<HTMLElement>(
    '[data-component="Toast"]'
  )!;
  const box = toast.getBoundingClientRect();
  await expect([box.left, box.right, box.top]).toEqual([
    edge.left + 8,
    edge.right - 8,
    edge.top + 8,
  ]);
  for (const button of bar(canvas).querySelectorAll(
    '[data-component="Button"]'
  )) {
    const each = button.getBoundingClientRect();
    await expect(each.top).toBeGreaterThanOrEqual(box.bottom);
    await expect(each.left).toBeGreaterThanOrEqual(edge.left);
    await expect(each.right).toBeLessThanOrEqual(edge.right);
    await expect(each.bottom).toBeLessThanOrEqual(edge.bottom);
  }
  const style = getComputedStyle(toast);
  await expect(style.position).not.toBe("sticky");
  await expect(style.boxShadow).toBe("none");
  await expect(style.zIndex).toBe("auto");
  await expect(style.viewTransitionName).toBe("action-failure");
}

const meta = {
  title: "Components/ActionBar",
  component: ActionBar,
  // Room for the raised shadow, which sits outside the bar.
  decorators: [
    (Story) => (
      <div className="p-sm">
        <Story />
      </div>
    ),
  ],
  play: ({ canvasElement, globals }) =>
    holdsNameStickinessAndHeight(canvasElement, globals.density),
} satisfies Meta<typeof ActionBar>;

export default meta;

type Story = StoryObj<typeof meta>;

// bulk-pay's bar: the one action on the selected invoices.
export const Default: Story = {
  args: { children: <Button intent="primary" text="Approve and pay" /> },
};

// The payment is running: the bar stays as it is, and its Button keeps its
// label while the edge fills, then sweeps, until the result arrives.
export const Pending: Story = {
  args: {
    children: <Button intent="primary" text="Approve and pay" pending />,
  },
  tags: ["animates-while-idle"],
};

// Two actions on the same selection, the main one last, at the end.
export const TwoActions: Story = {
  args: {
    children: (
      <>
        <Button intent="secondary" text="Send reminders" />
        <Button intent="primary" text="Approve and pay" />
      </>
    ),
  },
};

// Two actions on a phone: the bar narrows with the screen and keeps both
// Buttons inside it.
export const Phone: Story = {
  args: TwoActions.args,
  tags: ["phone"],
  play: async ({ canvasElement, globals }) => {
    await holdsNameStickinessAndHeight(canvasElement, globals.density);
    const edge = bar(canvasElement).getBoundingClientRect();
    for (const button of bar(canvasElement).querySelectorAll(
      '[data-component="Button"]'
    )) {
      const box = button.getBoundingClientRect();
      await expect(box.left).toBeGreaterThanOrEqual(edge.left);
      await expect(box.right).toBeLessThanOrEqual(edge.right);
    }
  },
};

// bulk-pay's failure, in the bar's own words (#243).
const failed =
  "Payment not scheduled: the funding account is too low. Add funds, then approve and pay again.";

// The action failed: the failure Toast is the bar's first row, above its
// Buttons, so the two float as one surface.
export const WithFailure: Story = {
  args: {
    children: (
      <>
        <Toast tone="failure" text={failed} />
        <Button intent="secondary" text="Send reminders" />
        <Button intent="primary" text="Approve and pay" />
      </>
    ),
  },
  play: async ({ canvasElement, globals }) => {
    await holdsNameStickinessAndHeight(canvasElement, globals.density);
    await holdsToastAboveButtons(canvasElement);
  },
};

// The failure on a phone: the Toast's copy wraps within the bar, and the
// Toast and both Buttons stay inside the bar's edges.
export const PhoneWithFailure: Story = {
  args: WithFailure.args,
  tags: ["phone"],
  play: async ({ canvasElement, globals }) => {
    await holdsNameStickinessAndHeight(canvasElement, globals.density);
    await holdsToastAboveButtons(canvasElement);
    const edge = bar(canvasElement).getBoundingClientRect();
    await expect(edge.left).toBeGreaterThanOrEqual(0);
    await expect(edge.right).toBeLessThanOrEqual(window.innerWidth);
  },
};

// invoice-queue's table as its rows-selected state renders it, with the bar
// right after it: the bar sits next to what it acts on.
function UnderTheTable() {
  const data = useFixtureData();
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
      <ActionBar>
        <Button intent="primary" text="Approve and pay" />
      </ActionBar>
    </Stack>
  );
}

export const WithSelectedRows: Story = {
  parameters: {
    screenState: {
      name: "rows-selected",
      fixture: "invoice-queue/rows-selected",
    },
  } satisfies ScreenStateParameters,
  render: () => <UnderTheTable />,
  play: async ({ canvasElement, globals }) => {
    await holdsNameStickinessAndHeight(canvasElement, globals.density);
    // It hugs its Button and ends where the table does.
    const table = canvasElement
      .querySelector('[data-component="DataTable"]')!
      .getBoundingClientRect();
    const edge = bar(canvasElement).getBoundingClientRect();
    const button = bar(canvasElement)
      .querySelector('[data-component="Button"]')!
      .getBoundingClientRect();
    await expect(edge.right).toBe(table.right);
    await expect(edge.width).toBe(button.width + 16);
  },
};

// invoice-queue's failure state under its table three times over, in a
// scroller no taller than the table's capped frame (#296), so the table runs
// past the bottom edge and the bar sticks there, as on a long queue. The
// failure Toast rides in the bar, so the two stick as one and the Toast never
// covers the Buttons (#243).
function FailedOnALongTable() {
  const data = useFixtureData();
  const rows = [0, 1, 2].flatMap((copy) =>
    data.invoices.map((row) =>
      copy === 0 ? row : { ...row, id: `${row.id}-${copy}` }
    )
  );
  return (
    <div data-scroller className="max-h-table overflow-y-auto">
      <Stack gap="xs">
        <DataTable
          selectable
          rows={rows}
          // One column, so the stuck bar floats over the rows' empty end, as
          // text-overflow holds any text the bar covers to collide with its
          // own.
          columns={["Invoice"]}
          cell={(row) => <Text text={row.number} />}
        />
        <ActionBar>
          <Toast tone="failure" text={failed} />
          <Button intent="primary" text="Approve and pay" />
        </ActionBar>
      </Stack>
    </div>
  );
}

export const FailedOnLongTable: Story = {
  parameters: {
    screenState: {
      name: "payment-failed",
      fixture: "invoice-queue/payment-failed",
    },
  } satisfies ScreenStateParameters,
  render: () => <FailedOnALongTable />,
  play: async ({ canvasElement, globals }) => {
    await holdsNameStickinessAndHeight(canvasElement, globals.density);
    await holdsToastAboveButtons(canvasElement);
    // The table runs past the scroller's bottom edge, and the bar sticks
    // 16px above it.
    const scroller = canvasElement
      .querySelector("[data-scroller]")!
      .getBoundingClientRect();
    const table = canvasElement
      .querySelector('[data-component="DataTable"]')!
      .getBoundingClientRect();
    const edge = bar(canvasElement).getBoundingClientRect();
    await expect(table.bottom).toBeGreaterThan(scroller.bottom);
    await expect(edge.bottom).toBe(scroller.bottom - 16);
  },
};
