import { ActivityIcon } from "lucide-react";
import { getAuditLogs } from "@/features/reports/api/reportApi";
import { usePharmacyNames } from "@/features/admin/hooks/usePharmacyNames";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader, ErrorBanner, Badge } from "@/components/common/PageBits";
import DataTable from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import { formatDateTime, shortId } from "@/lib/helpers/helpers";

/** Must match the backend ModerationAction enum. */
const ACTIONS = {
  RESOLVE_REPORT: { label: "Resolved report", badge: "bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-500" },
  DISMISS_REPORT: { label: "Dismissed report", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" },
  WARN_PHARMACY: { label: "Warned pharmacy", badge: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" },
  SUSPEND_PHARMACY: { label: "Suspended pharmacy", badge: "bg-rose-500/10 text-rose-600", dot: "bg-rose-500" },
  LIFT_SUSPENSION: { label: "Lifted suspension", badge: "bg-indigo-500/10 text-indigo-600", dot: "bg-indigo-500" },
};

const actionTone = (action) =>
  ACTIONS[action] ?? { label: action, badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" };

const roleLabel = (role) => {
  const r = (role ?? "").replace(/^ROLE_/, "");
  if (r === "ADMIN") return "Admin";
  if (r === "REPORT_ADMIN") return "Moderator";
  return r || "—";
};

/** Super-admin audit trail of every moderation action. */
export default function AdminAuditLogPage() {
  const list = usePagedList(getAuditLogs, { listKey: "logs", fallback: "Could not load the activity log." });
  const nameOf = usePharmacyNames(list.items.map((l) => l.pharmacyId));

  const columns = [
    { key: "when", header: "When", className: "whitespace-nowrap text-muted-foreground", cell: (l) => formatDateTime(l.createdAt) },
    { key: "action", header: "Action", cell: (l) => <Badge tone={actionTone(l.action)} /> },
    {
      key: "actor",
      header: "By",
      cell: (l) => (
        <>
          <span className="font-medium text-foreground">{roleLabel(l.actorRole)}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{shortId(l.actorId)}</span>
        </>
      ),
    },
    {
      key: "pharmacy",
      header: "Pharmacy",
      className: "text-muted-foreground",
      cell: (l) => (l.pharmacyId ? nameOf(l.pharmacyId) ?? `Pharmacy ${shortId(l.pharmacyId)}` : "—"),
    },
    {
      key: "details",
      header: "Details",
      className: "max-w-xs whitespace-normal text-muted-foreground",
      cell: (l) => l.details || "—",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Activity Log" subtitle="Every moderation action taken by admins and moderators." />
      <ErrorBanner>{list.error}</ErrorBanner>
      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        hideEmpty={Boolean(list.error)}
        loadingText="Loading activity…"
        empty={{ icon: ActivityIcon, title: "No activity yet", subtitle: "Moderation actions will be recorded here." }}
      />
      <Pagination page={list.page} totalPages={list.meta.totalPages} loading={list.loading} onChange={list.setPage} />
    </div>
  );
}
