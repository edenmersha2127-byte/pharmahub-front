import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BanknoteIcon, CalendarClockIcon, ReceiptIcon, RefreshCwIcon, ShoppingBagIcon, ShoppingCartIcon } from "lucide-react";
import * as salesApi from "@/features/sales/api/salesApi";
import { PAYMENT_METHODS, pageOf, paymentTone } from "@/features/sales/constants";
import { useCustomers } from "@/features/sales/hooks/useCustomers";
import ReceiptDialog from "@/features/sales/components/ReceiptDialog";
import SalesAnalytics from "@/features/sales/components/SalesAnalytics";
import StatCard from "@/features/sales/components/StatCard";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader, Tabs, ErrorBanner, Badge } from "@/components/common/PageBits";
import DataTable from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import { primaryBtn, ghostBtn, fieldClass, labelClass } from "@/components/common/styles";
import { PATHS } from "@/router/routes";
import { extractApiError, formatDateTime, formatMoney, shortId } from "@/lib/helpers/helpers";

const TABS = [
  { key: "history", label: "Sales history" },
  { key: "analytics", label: "Analytics" },
];

function deltaHint(summary) {
  const pct = summary?.revenueDeltaPct;
  if (pct == null) return { text: "No sales yesterday to compare with." };
  const value = Number(pct);
  if (value === 0) return { text: "Same as yesterday." };
  return value > 0
    ? { text: `Up ${value.toFixed(1)}% from yesterday`, className: "text-emerald-600" }
    : { text: `Down ${Math.abs(value).toFixed(1)}% from yesterday`, className: "text-rose-600" };
}

/** Today's sales count and revenue, compared with yesterday. */
function TodaySummary({ reloadKey }) {
  const [state, setState] = useState({ loading: true, summary: null, error: "" });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      setState({ loading: false, summary: await salesApi.getTodaySummary(), error: "" });
    } catch (e) {
      setState({ loading: false, summary: null, error: extractApiError(e, "Could not load today's summary.") });
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load, reloadKey]);

  const { loading, summary, error } = state;
  if (error) return <ErrorBanner>{error}</ErrorBanner>;

  const delta = deltaHint(summary);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard loading={loading} icon={ShoppingBagIcon} label="Sales today" value={summary?.salesCount ?? 0} />
      <StatCard
        loading={loading}
        icon={BanknoteIcon}
        label="Revenue today"
        value={formatMoney(summary?.totalRevenue)}
        hint={delta.text}
        hintClassName={delta.className}
      />
      <StatCard loading={loading} icon={CalendarClockIcon} label="Revenue yesterday" value={formatMoney(summary?.previousDayRevenue)} />
    </div>
  );
}

/** Every sale, newest first, with a receipt for each. */
function HistoryTab({ reloadKey }) {
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openSale, setOpenSale] = useState(null);
  const { nameOf } = useCustomers();

  // The backend returns every sale in one list with no filters, so it is
  // fetched once and filtered and paged here.
  const cache = useRef(null);
  const fetchPage = useCallback(
    async ({ page, size }) => {
      if (!cache.current || cache.current.key !== reloadKey) {
        cache.current = { key: reloadKey, promise: salesApi.getSales() };
      }
      let all;
      try {
        all = await cache.current.promise;
      } catch (e) {
        cache.current = null;
        throw e;
      }
      const rows = all.filter((s) => {
        const day = String(s.createdAt ?? "").slice(0, 10);
        return (!method || s.paymentMethod === method) && (!from || day >= from) && (!to || day <= to);
      });
      return pageOf(rows, page, size);
    },
    [reloadKey, method, from, to]
  );

  const list = usePagedList(fetchPage, {
    deps: [reloadKey, method, from, to],
    fallback: "Could not load your sales.",
  });

  const filtered = Boolean(method || from || to);

  function customerLabel(sale) {
    if (!sale.customerId) return "Walk-in";
    return nameOf(sale.customerId) ?? `Customer ${shortId(sale.customerId)}`;
  }

  const columns = [
    { key: "date", header: "Date", className: "text-muted-foreground", cell: (s) => formatDateTime(s.createdAt) },
    { key: "sale", header: "Sale", className: "font-mono text-xs text-muted-foreground", cell: (s) => shortId(s.saleId) },
    { key: "customer", header: "Customer", className: "text-foreground", cell: customerLabel },
    { key: "payment", header: "Paid by", cell: (s) => <Badge tone={paymentTone(s.paymentMethod)} /> },
    { key: "total", header: "Total", align: "right", className: "font-medium", cell: (s) => formatMoney(s.total) },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (s) => (
        <button onClick={() => setOpenSale(s)} className={ghostBtn}>
          <ReceiptIcon className="size-3.5" /> Receipt
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="sales-method" className={labelClass}>Paid by</label>
          <select id="sales-method" value={method} onChange={(e) => setMethod(e.target.value)} className={fieldClass}>
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sales-from" className={labelClass}>From</label>
          <input id="sales-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="sales-to" className={labelClass}>To</label>
          <input id="sales-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
        </div>
        {filtered && (
          <button
            onClick={() => {
              setMethod("");
              setFrom("");
              setTo("");
            }}
            className={ghostBtn}
          >
            Clear filters
          </button>
        )}
        {!list.loading && !list.error && (
          <p className="ml-auto text-sm text-muted-foreground">
            {list.meta.totalElements} sale{list.meta.totalElements === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <ErrorBanner>{list.error}</ErrorBanner>
      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(s) => s.saleId}
        loading={list.loading}
        hideEmpty={Boolean(list.error)}
        loadingText="Loading sales…"
        empty={
          filtered
            ? { icon: ReceiptIcon, title: "No sales match", subtitle: "Try different filters." }
            : { icon: ReceiptIcon, title: "No sales yet", subtitle: "Sales you make at the till will appear here." }
        }
      />
      <Pagination page={list.page} totalPages={list.meta.totalPages} loading={list.loading} onChange={list.setPage} />

      <ReceiptDialog
        saleId={openSale?.saleId ?? null}
        customerName={openSale ? nameOf(openSale.customerId) ?? undefined : undefined}
        onClose={() => setOpenSale(null)}
      />
    </>
  );
}

/** Pharmacy sales: today's summary, full history with receipts, and analytics. */
export default function SalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const tab = TABS.some((t) => t.key === raw) ? raw : "history";
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Sales" subtitle="What you have sold at the till, and how the pharmacy is doing.">
        <button onClick={() => setReloadKey((k) => k + 1)} className={ghostBtn}>
          <RefreshCwIcon className="size-3.5" /> Refresh
        </button>
        <Link to={PATHS.PHARMACY_POS} className={primaryBtn}>
          <ShoppingCartIcon className="size-4" /> New sale
        </Link>
      </PageHeader>

      <TodaySummary reloadKey={reloadKey} />

      <Tabs tabs={TABS} active={tab} onChange={(key) => setSearchParams({ tab: key })} />

      {tab === "history" && <HistoryTab reloadKey={reloadKey} />}
      {tab === "analytics" && <SalesAnalytics key={reloadKey} />}
    </div>
  );
}
