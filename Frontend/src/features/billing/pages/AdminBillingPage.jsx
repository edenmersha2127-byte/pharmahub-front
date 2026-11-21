import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CreditCardIcon, ReceiptIcon, TicketPercentIcon, PlusIcon } from "lucide-react";
import * as billingApi from "@/features/billing/api/billingApi";
import { planMeta, subscriptionStatusTone, paymentStatusTone } from "@/features/billing/constants";
import CreateCouponDialog from "@/features/billing/components/CreateCouponDialog";
import { usePharmacyNames } from "@/features/admin/hooks/usePharmacyNames";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader, Tabs, ErrorBanner, Badge } from "@/components/common/PageBits";
import DataTable from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import { primaryBtn } from "@/components/common/styles";
import { extractApiError, formatDate, formatDateTime, formatMoney, shortId } from "@/lib/helpers/helpers";

const TABS = [
  { key: "subscriptions", label: "Subscriptions" },
  { key: "payments", label: "Payments" },
  { key: "coupons", label: "Coupons" },
];

function PharmacyCell({ id, nameOf }) {
  const name = nameOf(id);
  return (
    <>
      <span className="font-medium text-foreground">{name ?? `Pharmacy ${shortId(id)}`}</span>
      {name && <span className="block font-mono text-[11px] text-muted-foreground">{shortId(id)}</span>}
    </>
  );
}

function SubscriptionsTab() {
  const list = usePagedList(billingApi.getAllSubscriptions, {
    listKey: "subscriptions",
    fallback: "Could not load subscriptions.",
  });
  const nameOf = usePharmacyNames(list.items.map((s) => s.pharmacyId));

  const columns = [
    { key: "pharmacy", header: "Pharmacy", cell: (s) => <PharmacyCell id={s.pharmacyId} nameOf={nameOf} /> },
    { key: "plan", header: "Plan", className: "text-muted-foreground", cell: (s) => (s.status === "TRIAL" ? "Trial" : planMeta(s.plan).label) },
    { key: "status", header: "Status", cell: (s) => <Badge tone={subscriptionStatusTone(s.status)} /> },
    { key: "start", header: "Started", className: "text-muted-foreground", cell: (s) => formatDate(s.startDate) },
    { key: "end", header: "Ends", className: "text-muted-foreground", cell: (s) => formatDate(s.endDate) },
    { key: "amount", header: "Amount", align: "right", className: "font-medium", cell: (s) => formatMoney(s.amount) },
  ];

  return (
    <>
      <ErrorBanner>{list.error}</ErrorBanner>
      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        hideEmpty={Boolean(list.error)}
        loadingText="Loading subscriptions…"
        empty={{ icon: CreditCardIcon, title: "No subscriptions yet", subtitle: "Pharmacy subscriptions and trials will appear here." }}
      />
      <Pagination page={list.page} totalPages={list.meta.totalPages} loading={list.loading} onChange={list.setPage} />
    </>
  );
}

function PaymentsTab() {
  const list = usePagedList(billingApi.getAllPayments, {
    listKey: "payments",
    fallback: "Could not load payments.",
  });
  const nameOf = usePharmacyNames(list.items.map((p) => p.pharmacyId));

  const columns = [
    { key: "date", header: "Date", className: "text-muted-foreground", cell: (p) => formatDateTime(p.createdAt) },
    { key: "pharmacy", header: "Pharmacy", cell: (p) => <PharmacyCell id={p.pharmacyId} nameOf={nameOf} /> },
    { key: "ref", header: "Reference", className: "font-mono text-xs text-muted-foreground", cell: (p) => p.txRef },
    { key: "coupon", header: "Coupon", className: "text-muted-foreground", cell: (p) => p.couponCode ?? "—" },
    { key: "status", header: "Status", cell: (p) => <Badge tone={paymentStatusTone(p.status)} /> },
    { key: "amount", header: "Amount", align: "right", className: "font-medium", cell: (p) => formatMoney(p.amount, p.currency) },
  ];

  return (
    <>
      <ErrorBanner>{list.error}</ErrorBanner>
      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        hideEmpty={Boolean(list.error)}
        loadingText="Loading payments…"
        empty={{ icon: ReceiptIcon, title: "No payments yet", subtitle: "Subscription payments will appear here." }}
      />
      <Pagination page={list.page} totalPages={list.meta.totalPages} loading={list.loading} onChange={list.setPage} />
    </>
  );
}

function couponTone(c) {
  if (!c.active) return { label: "Inactive", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now())
    return { label: "Expired", badge: "bg-rose-500/10 text-rose-600", dot: "bg-rose-500" };
  if (c.maxRedemptions != null && c.timesRedeemed >= c.maxRedemptions)
    return { label: "Used up", badge: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" };
  return { label: "Active", badge: "bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-500" };
}

function CouponsTab({ reloadKey }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCoupons(await billingApi.getCoupons());
    } catch (e) {
      setError(extractApiError(e, "Could not load coupons."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load, reloadKey]);

  const columns = [
    { key: "code", header: "Code", className: "font-mono font-semibold text-foreground", cell: (c) => c.code },
    {
      key: "discount",
      header: "Discount",
      cell: (c) => (c.discountType === "PERCENTAGE" ? `${Number(c.discountValue)}% off` : `${formatMoney(c.discountValue)} off`),
    },
    {
      key: "used",
      header: "Used",
      className: "text-muted-foreground",
      cell: (c) => `${c.timesRedeemed} / ${c.maxRedemptions ?? "∞"}`,
    },
    { key: "expires", header: "Expires", className: "text-muted-foreground", cell: (c) => (c.expiresAt ? formatDate(c.expiresAt) : "Never") },
    { key: "status", header: "Status", cell: (c) => <Badge tone={couponTone(c)} /> },
  ];

  return (
    <>
      <ErrorBanner>{error}</ErrorBanner>
      <DataTable
        columns={columns}
        rows={coupons}
        loading={loading}
        hideEmpty={Boolean(error)}
        loadingText="Loading coupons…"
        empty={{ icon: TicketPercentIcon, title: "No coupons yet", subtitle: "Create a coupon to offer pharmacies a discount." }}
      />
    </>
  );
}

/** Admin billing: every pharmacy subscription and payment, plus coupon management. */
export default function AdminBillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const tab = TABS.some((t) => t.key === raw) ? raw : "subscriptions";

  const [couponOpen, setCouponOpen] = useState(false);
  const [couponReload, setCouponReload] = useState(0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Billing" subtitle="Pharmacy subscriptions, payments and discount coupons.">
        {tab === "coupons" && (
          <button onClick={() => setCouponOpen(true)} className={primaryBtn}>
            <PlusIcon className="size-4" /> New coupon
          </button>
        )}
      </PageHeader>

      <Tabs tabs={TABS} active={tab} onChange={(key) => setSearchParams({ tab: key })} />

      {tab === "subscriptions" && <SubscriptionsTab />}
      {tab === "payments" && <PaymentsTab />}
      {tab === "coupons" && <CouponsTab reloadKey={couponReload} />}

      <CreateCouponDialog
        open={couponOpen}
        onClose={() => setCouponOpen(false)}
        onCreated={() => setCouponReload((k) => k + 1)}
      />
    </div>
  );
}
