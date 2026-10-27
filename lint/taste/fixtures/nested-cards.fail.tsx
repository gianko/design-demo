import { Card, Heading, Stack, Text } from "../../../src/index.ts";

// A Card inside a Card, planted where a children-only check would miss it:
// in a slot prop, under a Stack, and in a list mapped from data.
export function Invoice() {
  return (
    <Card header={<Heading level={2} text="INV-0142" />}>
      <Card> {/* ✗ taste/nested-cards */}
        <Text text="Northwind Logistics" />
      </Card>
    </Card>
  );
}

export function Payment() {
  return (
    <Card
      header={<Card />} // ✗ taste/nested-cards
      footer={
        <Stack direction="column" gap="xs">
          <Card /> {/* ✗ taste/nested-cards */}
        </Stack>
      }
    />
  );
}

export function Lines({ lines }: { lines: string[] }) {
  return (
    <Card>
      {lines.map((line) => (
        <Card key={line}> {/* ✗ taste/nested-cards */}
          <Text text={line} />
        </Card>
      ))}
    </Card>
  );
}
