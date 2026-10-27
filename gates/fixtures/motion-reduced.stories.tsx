import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import {
  ActionBar,
  Button,
  DataTable,
  Heading,
  Sheet,
  Text,
  useFixtureData,
} from "../../src/index.ts";

// motion-reduced (lint/taste/RULES.md). The rule opens a story again under
// reduced motion and drives what the library animates, so each failing story
// runs one wrong motion under it, at load or behind one of the drives:
// Animation moves a note as it loads; Transition moves it through a CSS
// transition once it has painted; Slow fades it, but over `base`; Loop runs
// the progress sweep without the static edge reduced motion asks for;
// Clicked moves the note when the ActionBar's Button is clicked; Row moves
// it inside the Sheet the first row opens. Pass does each of those as the
// brief asks: it slides where motion is welcome, and under reduced motion
// only fades, over `fast`. The animations are the Web Animations API's, so no
// raw value reaches a class or a style attribute.
type Variant =
  "pass" | "animation" | "css" | "slow" | "loop" | "clicked" | "row";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// The note arriving: a slide, or under reduced motion, when `honoured`, a
// `fast` fade.
function arrive(element: HTMLElement, honoured: boolean) {
  if (honoured && reduced()) {
    element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
  } else {
    element.animate(
      [
        { opacity: 0, translate: "0 8px" },
        { opacity: 1, translate: "0 0" },
      ],
      { duration: 240, easing: "cubic-bezier(0.2, 0, 0, 1)" }
    );
  }
}

const arrives = (element: HTMLElement | null) => {
  if (element) arrive(element, true);
};

const slides = (element: HTMLElement | null) => {
  if (element) arrive(element, false);
};

const fadesSlowly = (element: HTMLElement | null) => {
  element?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240 });
};

// A note that moves up into place through a CSS transition, once the page
// has painted it where it starts.
function Transitions() {
  const [placed, setPlaced] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPlaced(true))
    );
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <p
      className={`transition-transform duration-fast ease-standard ${placed ? "translate-y-0" : "translate-y-2xs"}`}
    >
      Northwind Logistics GmbH
    </p>
  );
}

// The note an ActionBar's Button brings in.
function Clicks({ honoured }: { honoured: boolean }) {
  const note = useRef<HTMLParagraphElement>(null);
  return (
    <>
      <p ref={note}>Invoice 2024-0117</p>
      <ActionBar>
        <Button
          intent="primary"
          text="Show details"
          onClick={() => arrive(note.current!, honoured)}
        />
      </ActionBar>
    </>
  );
}

// A table whose rows open a Sheet with the note arriving in it.
function Rows({ honoured }: { honoured: boolean }) {
  const invoices = useFixtureData().invoices.slice(0, 2);
  return (
    <DataTable
      rows={invoices}
      columns={["Invoice", "Contractor"]}
      cell={(row) => (
        <>
          <Text text={row.number} />
          <Text text={row.contractor} />
        </>
      )}
      detail={(row) => (
        <Sheet
          closeLabel="Close invoice details"
          title={<Heading level={2} text={row.number} />}
        >
          <p ref={honoured ? arrives : slides}>{row.contractor}</p>
        </Sheet>
      )}
    />
  );
}

const meta = {
  title: "GateFixtures/MotionReduced",
  args: { variant: "pass" },
  render: ({ variant }) => (
    <div className="flex flex-col items-start gap-sm bg-page p-page text-body text-ink">
      {variant === "pass" && (
        <>
          <p ref={arrives}>Northwind Logistics GmbH</p>
          <Clicks honoured />
          <Rows honoured />
        </>
      )}
      {variant === "animation" && <p ref={slides}>Northwind Logistics GmbH</p>}
      {variant === "css" && <Transitions />}
      {variant === "slow" && <p ref={fadesSlowly}>Northwind Logistics GmbH</p>}
      {variant === "loop" && (
        <div aria-hidden="true" className="h-edge w-4xl overflow-hidden">
          <div className="h-full animate-progress-sweep bg-accent" />
        </div>
      )}
      {variant === "clicked" && <Clicks honoured={false} />}
      {variant === "row" && <Rows honoured={false} />}
    </div>
  ),
} satisfies Meta<{ variant: Variant }>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pass: Story = {};

export const Animation: Story = { args: { variant: "animation" } };

export const Transition: Story = { args: { variant: "css" } };

export const Slow: Story = { args: { variant: "slow" } };

export const Loop: Story = { args: { variant: "loop" } };

export const Clicked: Story = { args: { variant: "clicked" } };

export const Row: Story = { args: { variant: "row" } };
