/* eslint-disable */
// PROTOTYPE, throwaway: #239's three corner options for ActionBar, switchable
// with the floating bar (or ← →), each under invoice-queue's table at both
// densities in both themes, with the bar's top-left corner magnified 5× and
// the two arcs' centres drawn. Concentric means the dots coincide. Lives on a
// throwaway branch, never main; the radii and paddings are inline because
// the 10px and 14px radii aren't tokens.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { useArgs } from "storybook/preview-api";
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

type Density = "admin" | "contractor";
type Theme = "light" | "dark";

const CONTROL_RADIUS = 6;

const variants = {
  A: {
    name: "Today: surface radius, 8px padding (not concentric)",
    radius: (d: Density) => (d === "admin" ? 8 : 12),
    padding: 8,
  },
  B: {
    name: "radius.raised 10px, 4px padding (concentric)",
    radius: () => 10,
    padding: 4,
  },
  C: {
    name: "radius.raised 14px, 8px padding (concentric)",
    radius: () => 14,
    padding: 8,
  },
} as const;
type Key = keyof typeof variants;
const keys = Object.keys(variants) as Key[];

function Bar({ radius, padding }: { radius: number; padding: number }) {
  return (
    <div
      className="relative ms-auto flex w-fit items-center gap-xs bg-surface-raised shadow-raised"
      style={{ borderRadius: radius, padding }}
    >
      <Button intent="secondary" text="Send reminders" />
      <Button intent="primary" text="Approve and pay" />
    </div>
  );
}

const ZOOM = 5;
const WINDOW = 36; // CSS px of corner shown, before zoom

function Magnifier({ radius, padding }: { radius: number; padding: number }) {
  const inner = padding + CONTROL_RADIUS;
  const off = radius - inner;
  return (
    <div className="flex flex-col gap-3xs">
      <div
        className="overflow-hidden bg-page"
        style={{
          width: WINDOW * ZOOM,
          height: WINDOW * ZOOM,
          outline:
            "1px solid color-mix(in srgb, currentColor 20%, transparent)",
        }}
      >
        <div style={{ zoom: ZOOM, padding: 4, position: "relative" }}>
          <Bar radius={radius} padding={padding} />
          <svg
            width={WINDOW}
            height={WINDOW}
            style={{
              position: "absolute",
              left: 4,
              top: 4,
              overflow: "visible",
            }}
          >
            <circle
              cx={radius}
              cy={radius}
              r={radius}
              fill="none"
              stroke="#e0218a"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={inner}
              cy={inner}
              r={CONTROL_RADIUS}
              fill="none"
              stroke="#1e88e5"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={radius} cy={radius} r={0.7} fill="#e0218a" />
            <circle cx={inner} cy={inner} r={0.45} fill="#1e88e5" />
          </svg>
        </div>
      </div>
      <Text
        size="caption"
        tone="muted"
        text={`outer ${radius}px · padding ${padding}px · inner ${CONTROL_RADIUS}px → ${
          off === 0 ? "concentric" : `centres ${Math.abs(off)}px apart`
        }`}
      />
    </div>
  );
}

function Cell({
  theme,
  density,
  variant,
}: {
  theme: Theme;
  density: Density;
  variant: Key;
}) {
  const data = useFixtureData();
  const v = variants[variant];
  const radius = v.radius(density);
  return (
    <div data-theme={theme} data-density={density} className="bg-page p-lg">
      <Stack gap="sm">
        <Text text={`${theme} · ${density}`} tone="muted" size="caption" />
        <div className="flex flex-wrap items-start gap-xl">
          <div className="min-w-0 flex-1">
            <Stack gap="xs">
              <DataTable
                selectable
                rows={data.invoices.slice(0, 3)}
                columns={["Invoice", "Contractor", "Amount", "Status"]}
                cell={(row) => (
                  <>
                    <Text text={row.number} />
                    <Text text={row.contractor} />
                    <Amount
                      value={row.amount}
                      currency={row.currency}
                      display="table"
                    />
                    <StatusTag status={row.status} />
                  </>
                )}
              />
              <Bar radius={radius} padding={v.padding} />
            </Stack>
          </div>
          <Magnifier radius={radius} padding={v.padding} />
        </div>
      </Stack>
    </div>
  );
}

type Update = (a: { variant: Key }) => void;

function Switcher({
  current,
  updateArgs,
}: {
  current: Key;
  updateArgs: Update;
}) {
  const step = (d: number) =>
    updateArgs({
      variant: keys[(keys.indexOf(current) + d + keys.length) % keys.length]!,
    });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (import.meta.env.PROD) return null;
  const btn: React.CSSProperties = {
    background: "transparent",
    color: "inherit",
    border: 0,
    fontSize: 18,
    cursor: "pointer",
    padding: "0 10px",
  };
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        borderRadius: 999,
        background: "#111",
        color: "#fff",
        font: "13px/1.2 system-ui, sans-serif",
        boxShadow: "0 6px 24px rgba(0,0,0,.35)",
      }}
    >
      <button style={btn} onClick={() => step(-1)} aria-label="Previous">
        ←
      </button>
      <span>
        <b>{current}</b> ({variants[current].name})
      </span>
      <button style={btn} onClick={() => step(1)} aria-label="Next">
        →
      </button>
    </div>
  );
}

function Corners({
  variant,
  updateArgs = () => {},
}: {
  variant: Key;
  updateArgs?: Update;
}) {
  return (
    <div style={{ paddingBottom: 80 }}>
      {(["light", "dark"] as const).flatMap((theme) =>
        (["admin", "contractor"] as const).map((density) => (
          <Cell
            key={theme + density}
            theme={theme}
            density={density}
            variant={variant}
          />
        ))
      )}
      <Switcher current={variant} updateArgs={updateArgs} />
    </div>
  );
}

const meta = {
  title: "Prototypes/ActionBar corners (#239)",
  component: Corners,
  argTypes: { variant: { control: "inline-radio", options: keys } },
  args: { variant: "A" },
  parameters: {
    layout: "fullscreen",
    screenState: {
      name: "rows-selected",
      fixture: "invoice-queue/rows-selected",
    },
  } satisfies { layout: string } & ScreenStateParameters,
} satisfies Meta<typeof Corners>;

export default meta;

// Storybook's preview hooks run only in the story's render function.
export const Options: StoryObj<typeof meta> = {
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return <Corners {...args} updateArgs={updateArgs} />;
  },
};
