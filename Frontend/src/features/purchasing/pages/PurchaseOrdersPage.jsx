import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PlusIcon, ClipboardListIcon, EyeIcon, PackageCheckIcon, TruckIcon } from "lucide-react";
import * as purchasingApi from "@/features/purchasing/api/purchasingApi";
import { orderStatusTone, orderUnits, formatCount } from "@/features/purchasing/constants";
import { useMedicineLookup } from "@/features/purchasing/hooks/useMedicineLookup";
import PurchaseOrderFormDialog from "@/features/purchasing/components/PurchaseOrderFormDialog";
import PurchaseOrderDetailsDialog from "@/features/purchasing/components/PurchaseOrderDetailsDialog";
import SaveError from "@/features/purchasing/components/SaveError";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader, Tabs, ErrorBanner, Badge } from "@/components/common/PageBits";
import DataTable from "@/components/common/DataTable";
import NoteDialog from "@/components/common/NoteDialog";
import { primaryBtn, ghostBtn } from "@/components/common/styles";
import { formatDateTime, formatMoney, parseApiError, shortId } from "@/lib/helpers/helpers";
import { PATHS } from "@/router/routes";
import { cn } from "@/lib/utils";

const TAB_KEYS = ["ALL", "DRAFT", "RECEIVED"];
const TAB_LABELS = { ALL: "All", DRAFT: "Not received", RECEIVED: "Received" };

const smallBtn = cn(ghostBtn, "px-2.5 py-1.5 text-xs");

/** Purchase orders: record what you buy, then receive it into stock when it arrives. */
export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const pharmacyId = user?.userId;

  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("status");
  const tab = TAB_KEYS.includes(raw) ? raw : "ALL";

  const list = usePagedList(() => (pharmacyId ? purchasingApi.getPurchaseOrders(pharmacyId) : []), {
    deps: [pharmacyId],
    fallback: "Could not load purchase orders.",
  });
  const lookup = useMedicineLookup(pharmacyId);

  // Suppliers are only needed for names and the order form, so a failure here
  // (for example, no permission to see suppliers) must not block the page.
  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!pharmacyId) return;
      try {
        const rows = await purchasingApi.getSuppliers(pharmacyId);
        if (active) setSuppliers(rows);
      } catch {
        if (active) setSuppliers([]);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [pharmacyId]);

  const supplierName = (id) => {
    if (!id) return "No supplier";
    return suppliers.find((s) => s.id === id)?.name ?? "Unknown supplier";
  };

  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [actionError, setActionError] = useState(null);

  const receive = (order) => {
    setViewingId(null);
    const units = orderUnits(order);
    setConfirm({
      title: "Receive this order?",
      description: `This adds ${formatCount(units)} unit${units === 1 ? "" : "s"} to your stock. It cannot be undone.`,
      confirmLabel: "Receive into stock",
      noNote: true,
      run: async () => {
        setActionError(null);
        try {
          await purchasingApi.receivePurchaseOrder(pharmacyId, order.id);
        } catch (err) {
          const parsed = parseApiError(err, "Could not receive the order. Please try again.");
          list.reload();
          // These two are shown on the page rather than in the dialog: one
          // needs a link to the plans, the other a clearer message.
          if (parsed.subscriptionRequired) return setActionError(parsed);
          if (err?.response?.status === 404) {
            return setActionError({
              message:
                "This order cannot be received because one of its medicines is no longer in your inventory. Nothing was added to stock.",
            });
          }
          throw err;
        }
        toast.success("Order received. Stock updated.");
        list.reload();
      },
    });
  };

  const counts = { ALL: list.items.length, DRAFT: 0, RECEIVED: 0 };
  list.items.forEach((o) => {
    if (o.status in counts) counts[o.status] += 1;
  });
  const tabs = TAB_KEYS.map((key) => ({ key, label: TAB_LABELS[key], count: list.loading ? null : counts[key] }));
  const rows = tab === "ALL" ? list.items : list.items.filter((o) => o.status === tab);

  const columns = [
    {
      key: "order",
      header: "Order",
      cell: (o) => (
        <>
          <span className="font-mono text-xs font-semibold text-foreground">{shortId(o.id)}</span>
          <span className="block text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</span>
        </>
      ),
    },
    { key: "supplier", header: "Supplier", className: "text-muted-foreground", cell: (o) => supplierName(o.supplierId) },
    {
      key: "items",
      header: "Items",
      className: "text-muted-foreground",
      cell: (o) => {
        const n = o.items?.length ?? 0;
        return `${n} item${n === 1 ? "" : "s"} · ${formatCount(orderUnits(o))} units`;
      },
    },
    { key: "status", header: "Status", cell: (o) => <Badge tone={orderStatusTone(o.status)} /> },
    { key: "total", header: "Total", align: "right", className: "font-medium", cell: (o) => formatMoney(o.totalCost) },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (o) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => setViewingId(o.id)} className={smallBtn}>
            <EyeIcon className="size-3.5" /> View
          </button>
          {o.status === "DRAFT" && (
            <button onClick={() => receive(o)} className={smallBtn}>
              <PackageCheckIcon className="size-3.5 text-emerald-600" /> Receive
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Purchase orders" subtitle="Record what you buy, then receive it into stock when it arrives.">
        <Link to={PATHS.PHARMACY_SUPPLIERS} className={ghostBtn}>
          <TruckIcon className="size-3.5" /> Suppliers
        </Link>
        <button onClick={() => setCreating(true)} className={primaryBtn}>
          <PlusIcon className="size-4" /> New order
        </button>
      </PageHeader>

      <Tabs tabs={tabs} active={tab} onChange={(key) => setSearchParams({ status: key })} />

      <SaveError error={actionError} />
      <ErrorBanner>{list.error}</ErrorBanner>

      <DataTable
        columns={columns}
        rows={rows}
        loading={list.loading}
        hideEmpty={Boolean(list.error)}
        loadingText="Loading purchase orders…"
        empty={
          tab === "ALL"
            ? { icon: ClipboardListIcon, title: "No purchase orders yet", subtitle: "Create an order when you buy stock from a supplier." }
            : { icon: ClipboardListIcon, title: "No orders here", subtitle: "There are no orders with this status." }
        }
      />

      {creating && (
        <PurchaseOrderFormDialog
          pharmacyId={pharmacyId}
          suppliers={suppliers}
          medicines={lookup.medicines}
          medicinesLoading={lookup.loading}
          medicinesError={lookup.error}
          onClose={() => setCreating(false)}
          onCreated={list.reload}
        />
      )}
      {viewingId && (
        <PurchaseOrderDetailsDialog
          key={viewingId}
          pharmacyId={pharmacyId}
          orderId={viewingId}
          supplierName={supplierName}
          medicineOf={lookup.byId}
          onReceive={receive}
          onClose={() => setViewingId(null)}
        />
      )}
      <NoteDialog config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
