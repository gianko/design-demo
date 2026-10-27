import { Card, Heading, Stack, Text } from "../../../src/index.ts";

// Cards side by side in a Stack, a Card's facts grouped by a Stack inside it,
// and copy that merely names the component.
export function Summary() {
  return (
    <Stack direction="column" gap="lg">
      <Card header={<Heading level={2} text="Paid this year" />}>
        <Stack direction="column" gap="3xs">
          <Text text="Never put a <Card> inside a <Card>." />
        </Stack>
      </Card>
      <Card>
        <Text text="Card" />
      </Card>
    </Stack>
  );
}
