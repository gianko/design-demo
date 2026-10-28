import {
  Amount,
  DataTable,
  EmptyState,
  Heading,
  Screen,
  Sheet,
  Stack,
  StatusTag,
  Text,
  useFixtureData,
  useScreenState,
} from "../../index.ts";

export function MyInvoices() {
  const data = useFixtureData();
  const { state } = useScreenState();

  return (
    <Screen audience="contractor">
      <Stack direction="column" gap="lg">
        <Heading text="My invoices" level={1} />
        {state === "default" && (
          <DataTable
            rows={data.yourInvoices}
            columns={["Invoice", "Amount", "Due", "Status"]}
            cell={(row) => (
              <>
                <Text text={row.number} />
                <Amount
                  value={row.amount}
                  currency={row.currency}
                  display="table"
                />
                <Text text={row.dueLabel} />
                <StatusTag status={row.status} />
              </>
            )}
            detail={(row) => (
              <>
                <Sheet
                  closeLabel="Close invoice details"
                  title={<Heading text={row.number} level={2} />}
                >
                  <Stack direction="column" gap="sm">
                    <Stack direction="row" justify="between">
                      <Amount
                        value={row.amount}
                        currency={row.currency}
                        display="card"
                      />
                      <StatusTag status={row.status} />
                    </Stack>
                    <Stack direction="row" gap="3xs" align="baseline">
                      <Text text="Due" />
                      <Text text={row.dueLabel} />
                    </Stack>
                    <Stack direction="row" gap="3xs" align="baseline">
                      <Text text="Billed to" />
                      <Text text={row.client} />
                    </Stack>
                    <Text text={row.lineCountLabel} tone="muted" />
                  </Stack>
                </Sheet>
              </>
            )}
          />
        )}
        {state === "empty" && (
          <EmptyState
            title="No invoices yet"
            text="Each invoice you send shows up here."
          />
        )}
      </Stack>
    </Screen>
  );
}
