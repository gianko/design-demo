import type { Meta, StoryObj } from "@storybook/react-vite";

// type-on-scale (lint/taste/RULES.md). Fail sets no size or weight off the
// scale itself; the browser does: a table header defaults to bold, and
// <small> shrinks its text to 80%. Pass uses every step of the scale.
const meta = {
  title: "GateFixtures/TypeOnScale",
  args: { fail: false },
  render: ({ fail }) =>
    fail ? (
      <div className="flex flex-col gap-sm bg-page p-page text-body text-ink">
        <table>
          <thead>
            <tr>
              <th>Contractor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ada Lovelace</td>
            </tr>
          </tbody>
        </table>
        <p>
          Paid <small>yesterday</small>
        </p>
      </div>
    ) : (
      <div className="flex flex-col gap-sm bg-page p-page text-ink">
        <p className="text-figure">Invoices</p>
        <p className="text-title">Awaiting approval</p>
        <p className="text-heading">This week</p>
        <p className="text-label">Approve and pay</p>
        <p className="text-body">Your money is on its way.</p>
        <p className="text-caption">Arrives Oct 20</p>
      </div>
    ),
} satisfies Meta<{ fail: boolean }>;

export default meta;

export const Pass: StoryObj<typeof meta> = {};

export const Fail: StoryObj<typeof meta> = { args: { fail: true } };
