// Planted as a generated screen. Each line below breaks one rule that only
// screens are held to; lint/token/token-lint.test.ts lists the findings.
import { createElement } from "react";
import { Dialog } from "radix-ui";
import * as Popover from "@radix-ui/react-popover";
import { Card, Screen, Text } from "../../index.ts";
import { Amount } from "../../amount/Amount.tsx";

export function Fixture() {
  return (
    <Screen audience="contractor">
      <Card footer={<span>Due Oct 8</span>}>
        <Text>Northwind Logistics</Text>
        <Amount value={4800} currency="USD" display="card" />
        {createElement("hr")}
        <Dialog.Root />
        <Popover.Root />
      </Card>
    </Screen>
  );
}
