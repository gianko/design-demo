// Planted as a generated screen: library components from the barrel only,
// and the screen's one action wired through the library's hooks (ADR 0011).
import {
  Button,
  Card,
  Screen,
  Text,
  useAction,
  useScreenState,
} from "../../index.ts";

export function Fixture() {
  const { state } = useScreenState();
  const sendReminder = useAction("sendReminder", {
    success: "reminder-sent",
    failure: "reminder-failed",
  });
  return (
    <Screen audience="contractor">
      <Card footer={<Text tone="muted">Due Oct 8</Text>}>
        <Text>Northwind Logistics</Text>
        {state === "reminder-sent" && <Text live>Reminder sent.</Text>}
        <Button
          pending={sendReminder.pending}
          onClick={() => sendReminder.run("INV-0142")}
        >
          Send reminder
        </Button>
      </Card>
    </Screen>
  );
}
