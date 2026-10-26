import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { useEffect, useState } from "react";

// A surface whose padding is set late: `p-surface` from the first paint, or
// `p-page` once `late` has waited. Each story states one style expectation as
// its `play` function, and each passes or fails only after an async wait, so
// a gate that checked a render before its play phase ended would miss both.
function Box({ late }: { late: boolean }) {
  const [settled, setSettled] = useState(!late);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 300);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="bg-page p-page">
      <div
        data-testid="box"
        className={`bg-surface ${settled ? "p-page" : "p-surface"}`}
      >
        <p className="text-body text-ink">Style expectation</p>
      </div>
    </div>
  );
}

const box = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>('[data-testid="box"]')!;

const meta = {
  title: "GateFixtures/StyleExpectation",
  component: Box,
  args: { late: false },
} satisfies Meta<typeof Box>;

export default meta;

type Story = StoryObj<typeof meta>;

// Fails after a wait: no density sets a 13px padding.
export const Fails: Story = {
  play: async ({ canvasElement }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(getComputedStyle(box(canvasElement)).paddingTop).toBe("13px");
  },
};

// Passes once the late padding has landed, which takes a wait.
export const PassesAfterWait: Story = {
  args: { late: true },
  play: async ({ canvasElement, globals }) => {
    const page = { admin: "28px", contractor: "36px" }[
      globals.density as "admin" | "contractor"
    ];
    await waitFor(() =>
      expect(getComputedStyle(box(canvasElement)).paddingTop).toBe(page)
    );
  },
};

// Rendered on a phone-width viewport.
export const Phone: Story = {
  tags: ["phone"],
  play: async () => {
    await expect(window.innerWidth).toBe(360);
  },
};
