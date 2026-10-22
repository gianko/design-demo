// Planted as a generated screen: library components from the barrel only.
import { Card, Screen, Text } from "../../index.ts";

export function Fixture() {
  return (
    <Screen audience="contractor">
      <Card footer={<Text tone="muted">Due Oct 8</Text>}>
        <Text>Northwind Logistics</Text>
      </Card>
    </Screen>
  );
}
