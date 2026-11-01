/* eslint-disable -- PROTOTYPE: not a generated screen, so the screen rules do not apply. */
// PROTOTYPE, throwaway (prototype/inline-notice branch): hosts the variants
// in a ScreenHost of its own, so the floating bar can pick whether the next
// "Send reminder" succeeds or fails, slow the motion down, and start over.
import { useEffect, useState, type CSSProperties } from "react";
import { ScreenHost, useScreenState } from "../../../index.ts";
import { variants } from "./variants.tsx";

type Key = (typeof variants)[number]["key"];

const states = [
  { name: "reminder-sent", fixture: "payment-status/reminder-sent" },
  { name: "reminder-failed", fixture: "payment-status/reminder-failed" },
] as const;

const durations = [
  "fast",
  "base",
  "slow",
  "fast-exit",
  "base-exit",
  "slow-exit",
] as const;

function readVariant(): Key {
  const asked = new URLSearchParams(window.location.search).get("variant");
  return variants.find(({ key }) => key === asked)?.key ?? "A";
}

export function NoticePrototype() {
  const [variant, setVariant] = useState<Key>(readVariant);
  const [fails, setFails] = useState(false);
  const [slow, setSlow] = useState(false);
  const [run, setRun] = useState(0);

  const cycle = (by: number) => {
    const at = variants.findIndex(({ key }) => key === variant);
    const next = variants[(at + by + variants.length) % variants.length]!.key;
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next);
    window.history.replaceState(null, "", url);
    setVariant(next);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable]")) return;
      if (event.key === "ArrowLeft") cycle(-1);
      if (event.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Slow motion: every duration token ×4, on the root, so the View
  // Transitions' pseudo-elements slow down too.
  useEffect(() => {
    const root = document.documentElement.style;
    for (const name of durations) {
      const property = `--ds-motion-duration-${name}`;
      if (slow) {
        const value = getComputedStyle(document.documentElement)
          .getPropertyValue(property)
          .trim();
        root.setProperty(property, `calc(${value} * 4)`);
      } else root.removeProperty(property);
    }
    return () => {
      for (const name of durations)
        root.removeProperty(`--ds-motion-duration-${name}`);
    };
  }, [slow]);

  const { Component, name } = variants.find(({ key }) => key === variant)!;
  return (
    <ScreenHost
      key={`${variant}:${run}`}
      states={states}
      settleUnder={
        fails
          ? "payment-status/reminder-failed"
          : "payment-status/reminder-sent"
      }
    >
      <Component />
      <Bar
        label={`${variant} · ${name}`}
        onPrevious={() => cycle(-1)}
        onNext={() => cycle(1)}
        fails={fails}
        onFails={() => setFails(!fails)}
        slow={slow}
        onSlow={() => setSlow(!slow)}
        onReset={() => setRun(run + 1)}
      />
    </ScreenHost>
  );
}

// Deliberately off-system: black pill, system font, so it reads as tooling.
const bar: CSSProperties = {
  position: "fixed",
  insetInline: 0,
  bottom: 16,
  margin: "0 auto",
  width: "max-content",
  maxWidth: "calc(100vw - 32px)",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#111",
  color: "#fff",
  font: "13px/1.2 system-ui, sans-serif",
  boxShadow: "0 4px 16px rgb(0 0 0 / 0.3)",
  zIndex: 2147483647,
};
const chip = (on = false): CSSProperties => ({
  border: "1px solid #555",
  borderRadius: 999,
  padding: "4px 10px",
  background: on ? "#fff" : "transparent",
  color: on ? "#111" : "#fff",
  font: "inherit",
  cursor: "pointer",
});

function Bar(props: {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  fails: boolean;
  onFails: () => void;
  slow: boolean;
  onSlow: () => void;
  onReset: () => void;
}) {
  const { state } = useScreenState();
  return (
    <div style={bar}>
      <button type="button" style={chip()} onClick={props.onPrevious}>
        ←
      </button>
      <span style={{ minWidth: 200, textAlign: "center" }}>{props.label}</span>
      <button type="button" style={chip()} onClick={props.onNext}>
        →
      </button>
      <button type="button" style={chip(props.fails)} onClick={props.onFails}>
        Next send {props.fails ? "fails" : "succeeds"}
      </button>
      <button type="button" style={chip(props.slow)} onClick={props.onSlow}>
        Slow ×4
      </button>
      <button type="button" style={chip()} onClick={props.onReset}>
        Reset
      </button>
      <code style={{ opacity: 0.7 }}>state: {state}</code>
    </div>
  );
}
