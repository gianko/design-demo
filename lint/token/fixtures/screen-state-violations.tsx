// Planted as a generated screen. Each marked line changes state outside the
// library (ADR 0011); lint/token/token-lint.test.ts lists the findings.
import * as React from "react";
import { useReducer, useState as useLocalState } from "react";
import { Screen, Text, useScreenState } from "../../index.ts";
import { fixtureVariant } from "../../fixtures/fixtures.ts";

const { operations } = fixtureVariant("default");

export function Fixture() {
  const { state } = useScreenState();
  const [shown, setShown] = React.useState(false);
  const [count, bump] = useReducer((n: number) => n + 1, 0);
  const [, setLocal] = useLocalState(0);
  const send = () =>
    document.startViewTransition(() => operations.sendReminder("INV-0142"));
  return (
    <Screen audience="contractor">
      <Text text={`${state} ${shown} ${count}`} />
      <Text
        text="Send"
        onClick={() => [setShown(true), bump(), setLocal(1), send()]}
      />
    </Screen>
  );
}
