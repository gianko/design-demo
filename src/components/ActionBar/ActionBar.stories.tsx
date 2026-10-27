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
  // A single row of Buttons; Phone checks the wrap on its own.
  if (bar(canvas).querySelectorAll('[data-component="Button"]').length === 1) {
    await expect(bar(canvas).getBoundingClientRect().height).toBe(control + 16);
  }
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

// invoice-queue's table as its rows-selected state renders it, with the bar
// right after it: the bar sits next to what it acts on.
function UnderTheTable() {
  const data = useFixtureData();
  return (
    <Stack gap="xs">
      <DataTable
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
