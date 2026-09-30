import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/app/CrudPage";
import { DataTable, Panel } from "@/components/app/ui";
import { usePaymentTypes, type PaymentType } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/payment-types")({
  head: () => ({ meta: [{ title: "Payment Types — LoomTrack" }, { name: "description", content: "Manage income and expense payment types." }, { property: "og:title", content: "Payment Types — LoomTrack" }, { property: "og:description", content: "Manage income and expense payment types." }] }),
  component: PaymentTypesPage,
});

const DIRS = [{ value: "INCOME", label: "Income" }, { value: "EXPENSE", label: "Expense" }];

function PaymentTypesPage() {
  // Standard types shared by all businesses (business_id null) are read-only here.
  const shared = (usePaymentTypes().data ?? []).filter((t) => t.business_id == null);
  return (
    <CrudPage<PaymentType & Record<string, unknown>>
      title="Payment Types" subtitle="The type decides whether a payment is income or expense" table="payment_types" singular="Payment type"
      uniqueLabel="payment type" searchKey="description"
      fields={[
        { key: "description", label: "Description", required: true },
        { key: "direction", label: "Direction", type: "select", options: DIRS, required: true },
        { key: "is_active", label: "Active", type: "bool", defaultValue: true },
      ]}
      columns={[
        { label: "Description", render: (r) => <span className="font-medium">{r.description}</span> },
        { label: "Direction", render: (r) => <span className={r.direction === "EXPENSE" ? "text-destructive" : "text-success"}>{r.direction === "EXPENSE" ? "Expense" : "Income"}</span> },
      ]}
    >
      {shared.length > 0 && (
        <div className="mt-5">
          <Panel title="Standard types (shared, read-only)">
            <DataTable head={<tr><th>No.</th><th>Description</th><th>Direction</th><th>Status</th></tr>}>
              {shared.map((t) => (
                <tr key={t.id}>
                  <td className="num">{t.id}</td><td>{t.description}</td>
                  <td className={t.direction === "EXPENSE" ? "text-destructive" : "text-success"}>{t.direction === "EXPENSE" ? "Expense" : "Income"}</td>
                  <td>{t.is_active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </DataTable>
          </Panel>
        </div>
      )}
    </CrudPage>
  );
}
