// The calibration set's broken copies (evals/calibration.ts) render as their
// kept screens do: every one of the kept screen's stories, composed with the
// Storybook preview, with the copy in the kept screen's place. Each shows
// the one thing it breaks.

import { composeStories } from "@storybook/react-vite";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it } from "vitest";
import preview from "../.storybook/preview.tsx";
import * as bulkPay from "../src/screens/bulk-pay/BulkPay.stories.tsx";
import * as myInvoices from "../src/screens/my-invoices/MyInvoices.stories.tsx";
import * as paymentStatus from "../src/screens/payment-status/PaymentStatus.stories.tsx";
import { BulkPay as BulkPayCopy } from "./calibration/screens/bulk-pay--copy/BulkPay.tsx";
import { BulkPay as BulkPayDensity } from "./calibration/screens/bulk-pay--density/BulkPay.tsx";
import { MyInvoices as MyInvoicesHierarchy } from "./calibration/screens/my-invoices--hierarchy/MyInvoices.tsx";
import { PaymentStatus as PaymentStatusAccent } from "./calibration/screens/payment-status--accent/PaymentStatus.tsx";
import { PaymentStatus as PaymentStatusElevation } from "./calibration/screens/payment-status--elevation/PaymentStatus.tsx";

afterEach(cleanup);

// The kept screen's stories with the copy in its place.
function copyStories(
  // A kept screen's stories module.
  stories: Record<string, unknown> & { default: object },
  copy: ComponentType
) {
  return Object.values(
    composeStories(
      { ...stories, default: { ...stories.default, component: copy } },
      preview
    )
  ) as ComponentType[];
}

describe("the broken copies", () => {
  it("render every story of their kept screen", () => {
    for (const [stories, copy] of [
      [paymentStatus, PaymentStatusAccent],
      [paymentStatus, PaymentStatusElevation],
      [bulkPay, BulkPayCopy],
      [bulkPay, BulkPayDensity],
      [myInvoices, MyInvoicesHierarchy],
    ] as const) {
      const composed = copyStories(stories, copy);
      expect(composed).toHaveLength(
        Object.keys(stories).filter((key) => key !== "default").length
      );
      for (const Story of composed) {
        const { unmount } = render(<Story />);
        expect(
          document.querySelector('[data-component="Screen"]')
        ).not.toBeNull();
        unmount();
      }
    }
  });

  it("payment-status--accent puts the accent on two actions", () => {
    const Default = copyStories(paymentStatus, PaymentStatusAccent)[0]!;
    render(<Default />);

    // Both styled as the primary action, accent fill and all.
    const [send, download] = ["Send reminder", "Download invoice"].map(
      (name) => screen.getByRole("button", { name }).className
    );
    expect(send).toContain("bg-accent");
    expect(download).toBe(send);
  });

  it("payment-status--elevation puts the card on a shadow", () => {
    const Default = copyStories(paymentStatus, PaymentStatusElevation)[0]!;
    render(<Default />);

    const card = document.querySelector('[data-component="Card"]')!;
    expect(card.parentElement!.classList).toContain("shadow-raised");
  });

  it("bulk-pay--copy titles the screen Streamline your payroll", () => {
    const Default = copyStories(bulkPay, BulkPayCopy)[0]!;
    render(<Default />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Streamline your payroll"
    );
  });

  it("bulk-pay--density gives the admin screen the contractor's density", () => {
    const Default = copyStories(bulkPay, BulkPayDensity)[0]!;
    render(<Default />);

    expect(
      document
        .querySelector('[data-component="Screen"]')!
        .getAttribute("data-density")
    ).toBe("contractor");
  });

  it("my-invoices--hierarchy has no title", () => {
    const Default = copyStories(myInvoices, MyInvoicesHierarchy)[0]!;
    render(<Default />);

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByText("My invoices")).toBeDefined();
  });
});
