import {
  Screen,
  Stack,
  PageHeader,
  Heading,
  DataTable,
  Text,
  Amount,
  StatusTag,
  EmptyState,
  Toast,
  Button,
  useFixtureData,
  useScreenState,
  useAction,
  useSelectedRows,
} from "../../index.ts";

export function BulkPay() {
  const data = useFixtureData();
  const { state } = useScreenState();
  const selected = useSelectedRows();
  const paySelected = useAction("payInvoices", {
    success: "payment-scheduled",
    failure: "payment-failed",
  });

  return (
    <Screen audience="admin">
      <Stack direction="column" gap="lg">
        <PageHeader title={<Heading text="Pay invoices" level={1} />} />
        {(state === "default" ||
          state === "rows-selected" ||
          state === "payment-scheduled" ||
          state === "payment-failed") && (
          <DataTable
            rows={data.payQueue}
            columns={["Invoice", "Contractor", "Amount", "Due", "Status"]}
            selectionText={{
              none: "No invoices selected",
              one: "1 invoice selected",
              other: "{count} invoices selected",
            }}
            cell={(row) => (
              <>
                <Text text={row.number} />
                <Text text={row.contractor} />
                <Amount
                  value={row.amount}
                  currency={row.currency}
                  display="table"
                />
                <Text text={row.dueLabel} />
                <StatusTag status={row.status} />
              </>
            )}
            actions={
              <Button
                text="Pay selected"
                intent="primary"
                pending={paySelected.pending}
                onClick={() => paySelected.run(selected)}
              />
            }
          />
        )}
        {state === "empty" && (
          <EmptyState
            title="No invoices to pay"
            text="New invoices show up here when contractors send them."
          />
        )}
        {state === "payment-failed" && (
          <Toast
            text="The payment didn't go through, so nothing was scheduled. Check your funding account, then try again."
            tone="failure"
          />
        )}
        {state === "payment-scheduled" && (
          <Toast
            text="3 invoices scheduled for the Oct 24 run."
            tone="success"
          />
        )}
      </Stack>
    </Screen>
  );
}
