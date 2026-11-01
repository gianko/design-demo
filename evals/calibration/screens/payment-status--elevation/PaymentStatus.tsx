import {
  Amount,
  Button,
  Card,
  Heading,
  Notice,
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
          <div className="max-w-card rounded-surface shadow-raised">
            <Card
              header={
                <Stack direction="row" justify="between" gap="xs">
                  <Heading text={invoice.number} level={2} />
                  <StatusTag status={invoice.status} />
                </Stack>
              }
              footer={
                (state === "default" || state === "reminder-failed") && (
                  <Stack direction="column" gap="xs">
                    <Button
                      text="Send reminder"
                      intent="primary"
                      pending={sendReminder.pending}
                      onClick={() => sendReminder.run(invoice.id)}
                    />
                  </Stack>
                )
              }
              result={
                state === "reminder-sent" ? (
                  <Notice
                    text="Reminder sent to Northwind. We'll tell you when they pay."
                    tone="success"
                  />
                ) : state === "reminder-failed" ? (
                  <Notice
                    text="We couldn't send your reminder. Check your connection and try again."
                    tone="failure"
                  />
                ) : undefined
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
          </div>
        )}
      </Stack>
    </Screen>
  );
}
