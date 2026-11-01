import {
  Amount,
  Card,
  EmptyState,
  Heading,
  PageHeader,
  Screen,
  Stack,
  StatusTag,
  Text,
  useFixtureData,
  useScreenState,
} from "../../index.ts";

export function PaymentRun() {
  const data = useFixtureData();
  const { state } = useScreenState();
  const due = data.paymentRun.dueInRun;
  const overdue = data.paymentRun.overdue;
  const awaiting = data.paymentRun.awaitingApproval;

  return (
    <Screen audience="admin">
      <Stack direction="column" gap="lg">
        <PageHeader
          title={<Heading text="Payment run" level={1} />}
          description={<Text text={data.paymentRun.dateLabel} tone="muted" />}
        />
        {state === "default" && (
          <Stack direction="row" gap="sm" align="stretch">
            <Card
              header={
                <Stack direction="row" justify="between" gap="2xs">
                  <Heading text="Due in this run" level={2} />
                  {due && <StatusTag status={due.status} />}
                </Stack>
              }
            >
              <Stack direction="column" gap="3xs">
                {due && (
                  <Amount
                    value={due.amount}
                    currency={due.currency}
                    display="card"
                  />
                )}
                {due && <Text text={due.countLabel} tone="muted" />}
              </Stack>
            </Card>
            <Card
              header={
                <Stack direction="row" justify="between" gap="2xs">
                  <Heading text="Overdue" level={2} />
                  {overdue && <StatusTag status={overdue.status} />}
                </Stack>
              }
            >
              <Stack direction="column" gap="3xs">
                {overdue && (
                  <Amount
                    value={overdue.amount}
                    currency={overdue.currency}
                    display="card"
                  />
                )}
                {overdue && <Text text={overdue.countLabel} tone="muted" />}
              </Stack>
            </Card>
            <Card
              header={
                <Stack direction="row" justify="between" gap="2xs">
                  <Heading text="Awaiting approval" level={2} />
                  {awaiting && <StatusTag status={awaiting.status} />}
                </Stack>
              }
            >
              <Stack direction="column" gap="3xs">
                {awaiting && (
                  <Amount
                    value={awaiting.amount}
                    currency={awaiting.currency}
                    display="card"
                  />
                )}
                {awaiting && <Text text={awaiting.countLabel} tone="muted" />}
              </Stack>
            </Card>
          </Stack>
        )}
        {state === "empty" && (
          <EmptyState
            title="Nothing in this run yet"
            text="Invoices join this run once they're approved and due before the run date."
          />
        )}
      </Stack>
    </Screen>
  );
}
