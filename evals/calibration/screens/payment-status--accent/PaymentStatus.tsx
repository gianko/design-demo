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
} from "../../index.ts";

export function PaymentStatus() {
  const data = useFixtureData();
  const { state } = useScreenState();
  const sendReminder = useAction("sendReminder", {
    success: "reminder-sent",
    failure: "reminder-failed",
  });

  const invoice = data.overdueInvoice;
  const showCard =
    state === "default" ||
    state === "reminder-sent" ||
    state === "reminder-failed";

  return (
    <Screen audience="contractor">
      <Stack direction="column" gap="lg">
        <Heading text="Payment status" level={1} />
        {state === "empty" && (
          <Stack direction="column" gap="2xs">
            <Heading text="No invoices yet" level={2} />
            <Text
              text="When you send an invoice, it shows up here with its status, and you can remind your client if it goes overdue."
              tone="muted"
            />
          </Stack>
        )}
        {showCard && invoice && (
          <Card
            header={
              <Stack direction="row" justify="between" gap="xs">
                <Heading text={invoice.number} level={2} />
                <StatusTag status={invoice.status} />
              </Stack>
            }
            footer={
              <Stack direction="column" gap="xs">
                {state === "reminder-sent" && (
                  <Text
                    text="Reminder sent to Northwind. We'll tell you when they pay."
                    live={true}
                  />
                )}
                {state === "reminder-failed" && (
                  <Text
                    text="We couldn't send your reminder. Check your connection and try again."
                    live={true}
                  />
                )}
                {(state === "default" || state === "reminder-failed") && (
                  <Stack direction="row" gap="xs">
                    <Button
                      text="Send reminder"
                      intent="primary"
                      pending={sendReminder.pending}
                      onClick={() => sendReminder.run(invoice.id)}
                    />
                    <Button text="Download invoice" intent="primary" />
                  </Stack>
                )}
              </Stack>
            }
          >
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
          </Card>
        )}
      </Stack>
    </Screen>
  );
}
