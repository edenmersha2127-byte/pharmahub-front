import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  PillIcon,
  WalletIcon,
  BoxesIcon,
  PackageXIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  ClockIcon,
  CalendarXIcon,
  HistoryIcon,
  ClipboardListIcon,
  PackageCheckIcon,
} from "lucide-react";
import * as purchasingApi from "@/features/purchasing/api/purchasingApi";
import { EXPIRY_WINDOWS, daysUntilDate, daysLabel, medicineLabel, formatCount } from "@/features/purchasing/constants";
import { useMedicineLookup } from "@/features/purchasing/hooks/useMedicineLookup";
import StockMovementChart from "@/features/purchasing/components/StockMovementChart";
import MedicineHistoryDialog from "@/features/purchasing/components/MedicineHistoryDialog";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader, Tabs, ErrorBanner, Badge } from "@/components/common/PageBits";
import DataTable from "@/components/common/DataTable";
import { ghostBtn, cardClass, fieldClass } from "@/components/common/styles";
import { extractApiError, formatDate, formatMoney } from "@/lib/helpers/helpers";
import { PATHS } from "@/router/routes";
import { cn } from "@/lib/utils";

const TAB_KEYS = ["low", "expiring", "expired"];
const smallBtn = cn(ghostBtn, "px-2.5 py-1.5 text-xs");

const OUT_TONE = { label: "Out of stock", badge: "bg-rose-500/10 text-rose-600", dot: "bg-rose-500" };
const LOW_TONE = { label: "Low", badge: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" };

const ICON_TONES = {
  indigo: "bg-indigo-500/10 text-indigo-600",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
};

function Trend({ pct }) {
  if (pct == null) return null;
  const n = Number(pct);
  if (Number.isNaN(n)) return null;
  const Icon = n < 0 ? TrendingDownIcon : TrendingUpIcon;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={cn("size-3.5", n < 0 ? "text-rose-600" : "text-emerald-600")} />
      {n > 0 ? "+" : ""}
      {n.toLocaleString(undefined, { maximumFractionDigits: 1 })}% in 30 days
    </span>
  );
}

function StatCard({ icon: Icon, tone = "indigo", label, value, hint, loading }) {
  return (
    <div className={cn(cardClass, "flex items-start gap-3 p-4")}>
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", ICON_TONES[tone])}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-6 w-20 animate-pulse rounded bg-muted" />
        ) : (
          <p className="truncate font-heading text-xl font-bold tracking-tight text-foreground">{value}</p>
        )}
        {hint && !loading && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function HistoryButton({ onClick }) {
  return (
    <button onClick={onClick} className={smallBtn}>
      <HistoryIcon className="size-3.5" /> History
    </button>
  );
}

function LowStockTab({ pharmacyId, onHistory }) {
  const list = usePagedList(() => (pharmacyId ? purchasingApi.getLowStock(pharmacyId) : []), {
    deps: [pharmacyId],
    fallback: "Could not load low stock medicines.",
  });

  const columns = [
    {
      key: "medicine",
      header: "Medicine",
      className: "whitespace-normal",
      cell: (m) => (
        <>
          <span className="font-medium text-foreground">{m.medicineName}</span>
          {(m.brandName || m.genericName) && (
            <span className="block text-xs text-muted-foreground">{[m.brandName, m.genericName].filter(Boolean).join(" · ")}</span>
          )}
        </>
      ),
    },
    { key: "status", header: "Status", cell: (m) => <Badge tone={m.stockQuantity <= 0 ? OUT_TONE : LOW_TONE} /> },
    { key: "stock", header: "In stock", align: "right", className: "font-medium tabular-nums", cell: (m) => formatCount(m.stockQuantity) },
    { key: "min", header: "Minimum", align: "right", className: "tabular-nums text-muted-foreground", cell: (m) => formatCount(m.minimumStockLevel) },
    { key: "cost", header: "Last cost", align: "right", className: "text-muted-foreground", cell: (m) => formatMoney(m.purchasePrice) },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (m) => <HistoryButton onClick={() => onHistory(m.id, m.medicineName)} />,
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Medicines at or below their minimum stock level.</p>
        <Link to={PATHS.PHARMACY_PURCHASES} className={ghostBtn}>
          <ClipboardListIcon className="size-3.5" /> Order stock
        </Link>
      </div>
      <ErrorBanner>{list.error}</ErrorBanner>
      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        hideEmpty={Boolean(list.error)}
        loadingText="Loading low stock medicines…"
        empty={{ icon: PackageCheckIcon, title: "Nothing is running low", subtitle: "Every medicine is above its minimum stock level." }}
      />
    </>
  );
}

function BatchesTab({ pharmacyId, expired, medicineOf, onHistory }) {
  const [days, setDays] = useState(EXPIRY_WINDOWS[0]);

  const list = usePagedList(
    () => {
      if (!pharmacyId) return [];
      return expired ? purchasingApi.getExpiredBatches(pharmacyId) : purchasingApi.getExpiringBatches(pharmacyId, days);
    },
    {
      deps: [pharmacyId, expired, days],
      fallback: expired ? "Could not load expired batches." : "Could not load expiring batches.",
    }
  );

  const columns = [
    {
      key: "medicine",
      header: "Medicine",
      className: "whitespace-normal font-medium text-foreground",
      cell: (b) => medicineLabel(medicineOf(b.medicineId), b.medicineId),
    },
    { key: "batch", header: "Batch", className: "text-muted-foreground", cell: (b) => b.batchNumber || "—" },
    {
      key: "expiry",
      header: expired ? "Expired" : "Expires",
      cell: (b) => (
        <>
          <span className="text-foreground">{formatDate(b.expiryDate)}</span>
          <span className="block text-xs text-muted-foreground">{daysLabel(daysUntilDate(b.expiryDate))}</span>
        </>
      ),
    },
    { key: "qty", header: "Units left", align: "right", className: "font-medium tabular-nums", cell: (b) => formatCount(b.quantity) },
    {
      key: "value",
      header: "Cost value",
      align: "right",
      className: "text-muted-foreground",
      cell: (b) => (b.purchasePrice == null ? "—" : formatMoney(Number(b.purchasePrice) * b.quantity)),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (b) => <HistoryButton onClick={() => onHistory(b.medicineId, medicineLabel(medicineOf(b.medicineId), b.medicineId))} />,
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {expired
            ? "Batches past their expiry date that still have units in stock."
            : "Batches with units in stock that will expire soon."}
        </p>
        {!expired && (
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Expiring within"
            className={cn(fieldClass, "w-auto py-1.5")}
          >
            {EXPIRY_WINDOWS.map((d) => (
              <option key={d} value={d}>
                Next {d} days
              </option>
            ))}
          </select>
        )}
      </div>
      <ErrorBanner>{list.error}</ErrorBanner>
      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        hideEmpty={Boolean(list.error)}
        loadingText="Loading batches…"
        empty={
          expired
            ? { icon: PackageCheckIcon, title: "No expired stock", subtitle: "None of your batches are past their expiry date." }
            : { icon: PackageCheckIcon, title: "Nothing expiring soon", subtitle: `No batches expire in the next ${days} days.` }
        }
      />
    </>
  );
}

/** Stock insights: headline numbers, monthly stock movement, and the low / expiring / expired lists. */
export default function StockInsightsPage() {
  const { user } = useAuth();
  const pharmacyId = user?.userId;

  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const tab = TAB_KEYS.includes(raw) ? raw : "low";

  const lookup = useMedicineLookup(pharmacyId);
  const [history, setHistory] = useState(null); // { id, name }
  const openHistory = (id, name) => setHistory({ id, name });

  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!pharmacyId) return;
      setStatsError("");
      try {
        // Trends are a nice-to-have; the cards still work without them.
        const [s, t] = await Promise.all([
          purchasingApi.getStats(pharmacyId),
          purchasingApi.getStatsTrends(pharmacyId).catch(() => null),
        ]);
        if (!active) return;
        setStats(s);
        setTrends(t);
      } catch (e) {
        if (active) setStatsError(extractApiError(e, "Could not load stock numbers."));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [pharmacyId]);

  const loading = !stats && !statsError;
  const s = stats ?? {};

  const tabs = [
    { key: "low", label: "Low stock", count: stats?.lowStockCount },
    { key: "expiring", label: "Expiring soon" },
    { key: "expired", label: "Expired", count: stats?.expiredCount },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Stock insights" subtitle="What you have, what is running low and what is about to expire.">
        <Link to={PATHS.PHARMACY_INVENTORY} className={ghostBtn}>
          <PillIcon className="size-3.5" /> Inventory
        </Link>
      </PageHeader>

      <ErrorBanner>{statsError}</ErrorBanner>

      {!statsError && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={PillIcon}
            label="Medicines"
            value={formatCount(s.totalMedicines)}
            hint={trends?.medicinesDeltaPct != null ? <Trend pct={trends.medicinesDeltaPct} /> : "Different medicines you stock"}
            loading={loading}
          />
          <StatCard
            icon={WalletIcon}
            label="Stock value"
            value={formatMoney(s.totalInventoryValue)}
            hint={trends?.inventoryValueDeltaPct != null ? <Trend pct={trends.inventoryValueDeltaPct} /> : "What your stock cost you"}
            loading={loading}
          />
          <StatCard
            icon={BoxesIcon}
            label="Units in stock"
            value={formatCount(s.totalStockUnits)}
            hint={`${formatCount(s.inStockCount)} of ${formatCount(s.totalMedicines)} medicines in stock`}
            loading={loading}
          />
          <StatCard
            icon={PackageXIcon}
            tone={s.outOfStockCount > 0 ? "rose" : "indigo"}
            label="Out of stock"
            value={formatCount(s.outOfStockCount)}
            hint="Medicines with no units left"
            loading={loading}
          />
          <StatCard
            icon={TrendingDownIcon}
            tone={s.lowStockCount > 0 ? "amber" : "indigo"}
            label="Low stock"
            value={formatCount(s.lowStockCount)}
            hint="Medicines at or below their minimum"
            loading={loading}
          />
          <StatCard
            icon={ClockIcon}
            tone={s.expiringSoonCount > 0 ? "amber" : "indigo"}
            label="Expiring soon"
            value={formatCount(s.expiringSoonCount)}
            hint="Batches close to their expiry date"
            loading={loading}
          />
          <StatCard
            icon={CalendarXIcon}
            tone={s.expiredCount > 0 ? "rose" : "indigo"}
            label="Expired"
            value={formatCount(s.expiredCount)}
            hint="Batches past their expiry date"
            loading={loading}
          />
        </div>
      )}

      <StockMovementChart pharmacyId={pharmacyId} />

      <Tabs tabs={tabs} active={tab} onChange={(key) => setSearchParams({ tab: key })} />

      {tab === "low" && <LowStockTab pharmacyId={pharmacyId} onHistory={openHistory} />}
      {tab !== "low" && (
        <BatchesTab
          key={tab}
          pharmacyId={pharmacyId}
          expired={tab === "expired"}
          medicineOf={lookup.byId}
          onHistory={openHistory}
        />
      )}

      {history && (
        <MedicineHistoryDialog
          key={history.id}
          pharmacyId={pharmacyId}
          medicineId={history.id}
          medicineName={history.name}
          onClose={() => setHistory(null)}
        />
      )}
    </div>
  );
}
