/* eslint-disable -- PROTOTYPE: not a generated screen, so the screen rules do not apply. */
// PROTOTYPE, throwaway (prototype/inline-notice branch). Four takes on the
// payment-status card's action result, switchable with ?variant=:
//   A  today's plain live Text, with the screen-state crossfade
//   B  a tinted Notice above the Button, collapsing in and out
//   C  a full-width strip on the card's bottom edge, collapsing in and out
//   D  a Notice that takes the Button's place and holds the retry
// Question: does a tinted Notice read better than plain copy, and does the
// collapse feel right?
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useEffect, useRef, type ReactNode } from "react";
import { useAnnounce } from "../../../components/Screen/announce.ts";
import { useStateEntry } from "../../../components/Screen/screen-state.tsx";
import {
  Amount,
  Button,
  Card,
  Heading,
  Screen,
  Stack,
  StatusTag,
  Text,
  useAction,
  useFixtureData,
  useScreenState,
} from "../../../index.ts";
import { PaymentStatus } from "../PaymentStatus.tsx";
import "./notice-prototype.css";

type Result = "sent" | "failed" | null;

const copy = {
  sent: "Reminder sent to Northwind. We'll tell you when they pay.",
  failed:
    "We couldn't send your reminder. Check your connection and try again.",
};

function useReminder() {
  const { overdueInvoice: invoice } = useFixtureData();
  const { state } = useScreenState();
  const sendReminder = useAction("sendReminder", {
    success: "reminder-sent",
    failure: "reminder-failed",
  });
  const result: Result =
    state === "reminder-sent"
      ? "sent"
      : state === "reminder-failed"
        ? "failed"
        : null;
  const canSend = state === "default" || state === "reminder-failed";
  const button = invoice && (
    <Button
      text="Send reminder"
      intent="primary"
      pending={sendReminder.pending}
      onClick={() => sendReminder.run(invoice.id)}
    />
  );
  return { invoice, state, result, canSend, button };
}

// The result's copy goes to Screen's status region each time its state is
// entered, as a live Text's does.
function useAnnounced(result: Result) {
  const announce = useAnnounce();
  const entry = useStateEntry();
  useEffect(() => {
    if (result) announce(copy[result]);
  }, [result, announce, entry]);
}

// MUI-style Collapse: stays mounted, keeps its last children while it
// closes, and animates its height (notice-prototype.css).
function Collapse({
  open,
  settle = false,
  children,
}: {
  open: boolean;
  settle?: boolean;
  children: ReactNode;
}) {
  const last = useRef(children);
  if (open) last.current = children;
  return (
    <div
      className="proto-collapse"
      data-open={open}
      data-ease={settle ? "settle" : "standard"}
    >
      <div inert={!open}>{open ? children : last.current}</div>
    </div>
  );
}

const tone = {
  sent: "bg-surface-raised text-ink",
  failed: "bg-error text-error",
};

function Glyph({ result }: { result: "sent" | "failed" }) {
  const Icon = result === "sent" ? CheckCircleIcon : WarningCircleIcon;
  return (
    <span className="proto-icon-line">
      <Icon aria-hidden weight="regular" className="size-icon" />
    </span>
  );
}

function Notice({
  result,
  children,
}: {
  result: "sent" | "failed";
  children?: ReactNode;
}) {
  return (
    <div
      className={`proto-tone flex items-start gap-xs rounded-control px-sm py-xs text-body ${tone[result]}`}
    >
      <Glyph result={result} />
      <div className="flex grow flex-col gap-xs">
        <p>{copy[result]}</p>
        {children}
      </div>
    </div>
  );
}

function Header() {
  const { invoice } = useReminder();
  if (!invoice) return null;
  return (
    <Stack direction="row" justify="between" gap="xs">
      <Heading text={invoice.number} level={2} />
      <StatusTag status={invoice.status} />
    </Stack>
  );
}

function Body() {
  const { invoice } = useReminder();
  if (!invoice) return null;
  return (
    <Stack direction="column" gap="xs">
      <Amount
        value={invoice.amount}
        currency={invoice.currency}
        display="card"
      />
      <Stack direction="row" gap="3xs" align="baseline">
        <Text text="Due " />
        <Text text={invoice.dueLabel} />
      </Stack>
      <Text text={invoice.client} tone="muted" />
    </Stack>
  );
}

// The collapse variants animate the live DOM, so while one is mounted the
// screen-state View Transition's root crossfade is muted: the old view
// vanishes at once and the new one shows live, height animation and all.
// Injected here because src/styles.test.ts keeps view-transition styling
// out of every stylesheet but src/styles.css.
const muteRootCrossfade = `
:root:has([data-proto-collapse])::view-transition-old(root) { animation: none; opacity: 0; }
:root:has([data-proto-collapse])::view-transition-new(root) { animation: none; }
`;

function Page({ children }: { children: ReactNode }) {
  return (
    <Screen audience="contractor">
      <style>{muteRootCrossfade}</style>
      <Stack direction="column" gap="lg">
        <Heading text="Payment status" level={1} />
        {children}
      </Stack>
    </Screen>
  );
}

export function VariantA() {
  return <PaymentStatus />;
}

export function VariantB() {
  const { result, canSend, button } = useReminder();
  useAnnounced(result);
  return (
    <Page>
      <div data-proto-collapse className="contents">
        <Card
          header={<Header />}
          footer={
            <div className="flex flex-col">
              <Collapse open={result !== null} settle={result === "sent"}>
                {result && (
                  <div className="pb-xs">
                    <Notice result={result} />
                  </div>
                )}
              </Collapse>
              <Collapse open={canSend}>
                <div className="flex flex-col">{button}</div>
              </Collapse>
            </div>
          }
        >
          <Body />
        </Card>
      </div>
    </Page>
  );
}

export function VariantC() {
  const { result, canSend, button } = useReminder();
  useAnnounced(result);
  return (
    <Page>
      <div
        data-proto-collapse
        data-component="Card"
        className="flex max-w-card flex-col overflow-hidden rounded-surface border border-line bg-surface"
      >
        <div className="flex flex-col p-surface">
          <div className="flex flex-col gap-md">
            <Header />
            <Body />
          </div>
          <Collapse open={canSend}>
            <div className="flex flex-col pt-md">{button}</div>
          </Collapse>
        </div>
        <Collapse open={result !== null} settle={result === "sent"}>
          {result && (
            <div
              className={`proto-strip proto-tone flex items-start gap-xs px-surface py-sm text-body ${tone[result]}`}
            >
              <Glyph result={result} />
              <p>{copy[result]}</p>
            </div>
          )}
        </Collapse>
      </div>
    </Page>
  );
}

export function VariantD() {
  const { state, result, button } = useReminder();
  useAnnounced(result);
  return (
    <Page>
      <div data-proto-collapse className="contents">
        <Card
          header={<Header />}
          footer={
            <div className="flex flex-col">
              <Collapse open={state === "default"}>
                <div className="flex flex-col">{button}</div>
              </Collapse>
              <Collapse open={result !== null} settle={result === "sent"}>
                {result && (
                  <Notice result={result}>
                    {result === "failed" && (
                      <div className="flex flex-col">{button}</div>
                    )}
                  </Notice>
                )}
              </Collapse>
            </div>
          }
        >
          <Body />
        </Card>
      </div>
    </Page>
  );
}

export const variants = [
  { key: "A", name: "Plain live Text (today)", Component: VariantA },
  { key: "B", name: "Notice above the button", Component: VariantB },
  { key: "C", name: "Strip on the card's edge", Component: VariantC },
  { key: "D", name: "Notice holds the retry", Component: VariantD },
] as const;
