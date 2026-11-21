import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getMedicineBatches, getMedicineMovements } from "@/features/purchasing/api/purchasingApi";
import { movementTypeTone, daysUntilDate, formatCount } from "@/features/purchasing/constants";
import { Tabs, Badge, ErrorBanner } from "@/components/common/PageBits";
import { extractApiError, formatDate, formatDateTime, formatMoney } from "@/lib/helpers/helpers";

const th = "px-3 py-2 font-medium";
const td = "px-3 py-2";

function BatchesTable({ batches }) {
  if (batches.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No batches recorded for this medicine.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left text-xs text-muted-foreground">
            <th className={th}>Batch</th>
            <th className={th}>Expires</th>
            <th className={th}>Received</th>
            <th className={`${th} text-right`}>Left</th>
            <th className={`${th} text-right`}>Unit cost</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const days = daysUntilDate(b.expiryDate);
            return (
              <tr key={b.id} className="border-b border-foreground/5 last:border-0">
                <td className={`${td} font-medium text-foreground`}>{b.batchNumber || "—"}</td>
                <td className={`${td} whitespace-nowrap text-muted-foreground`}>
                  {formatDate(b.expiryDate)}
                  {days != null && days < 0 && b.quantity > 0 && <span className="ml-1.5 text-xs font-medium text-rose-600">Expired</span>}
                </td>
                <td className={`${td} whitespace-nowrap text-muted-foreground`}>{formatDate(b.receivedAt)}</td>
                <td className={`${td} text-right tabular-nums`}>{formatCount(b.quantity)}</td>
                <td className={`${td} whitespace-nowrap text-right tabular-nums text-muted-foreground`}>{formatMoney(b.purchasePrice)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MovementsTable({ movements }) {
  if (movements.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No stock changes recorded yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left text-xs text-muted-foreground">
            <th className={th}>When</th>
            <th className={th}>Type</th>
            <th className={`${th} text-right`}>Change</th>
            <th className={`${th} text-right`}>Stock after</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id} className="border-b border-foreground/5 last:border-0">
              <td className={`${td} whitespace-nowrap text-muted-foreground`}>{formatDateTime(m.createdAt)}</td>
              <td className={td}>
                <Badge tone={movementTypeTone(m.type)} />
              </td>
              <td className={`${td} text-right font-medium tabular-nums`}>
                {m.quantityChange > 0 ? `+${formatCount(m.quantityChange)}` : formatCount(m.quantityChange)}
              </td>
              <td className={`${td} text-right tabular-nums text-muted-foreground`}>{formatCount(m.resultingQuantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Batches and stock history of one medicine. Mount it only while open.
 * @param medicineId, medicineName  the medicine to show
 */
export default function MedicineHistoryDialog({ pharmacyId, medicineId, medicineName, onClose }) {
  const [tab, setTab] = useState("batches");
  const [data, setData] = useState(null); // { batches, movements }
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [batches, movements] = await Promise.all([
          getMedicineBatches(pharmacyId, medicineId),
          getMedicineMovements(pharmacyId, medicineId),
        ]);
        if (active) setData({ batches, movements });
      } catch (e) {
        if (active) setError(extractApiError(e, "Could not load this medicine's history."));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [pharmacyId, medicineId]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{medicineName}</DialogTitle>
          <DialogDescription>Batches of this medicine and every change to its stock.</DialogDescription>
        </DialogHeader>

        <ErrorBanner>{error}</ErrorBanner>
        {!data && !error && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}

        {data && (
          <>
            <Tabs
              tabs={[
                { key: "batches", label: "Batches", count: data.batches.length },
                { key: "movements", label: "Stock changes", count: data.movements.length },
              ]}
              active={tab}
              onChange={setTab}
            />
            {tab === "batches" ? <BatchesTable batches={data.batches} /> : <MovementsTable movements={data.movements} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
