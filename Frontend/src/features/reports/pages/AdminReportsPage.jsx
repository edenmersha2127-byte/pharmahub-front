import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  FlagIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  BanIcon,
  UnlockIcon,
  UserPlusIcon,
} from "lucide-react";
import * as reportApi from "@/features/reports/api/reportApi";
import ReportCard from "@/features/reports/components/ReportCard";
import { isUnresolved } from "@/features/reports/constants";
import CreateReportAdminDialog from "@/features/admin/components/CreateReportAdminDialog";
import { usePharmacyNames, rememberPharmacyName } from "@/features/admin/hooks/usePharmacyNames";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROLES } from "@/lib/auth/roles";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader, Tabs } from "@/components/common/PageBits";
import ListState from "@/components/common/ListState";
import NoteDialog from "@/components/common/NoteDialog";
import Pagination from "@/components/common/Pagination";
import { ghostBtn, cardClass } from "@/components/common/styles";
import { shortId } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "AWAITING_PHARMACY_RESPONSE", label: "Awaiting response" },
  { key: "UNDER_REVIEW", label: "Under review" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "DISMISSED", label: "Dismissed" },
];

const smallBtn = cn(ghostBtn, "px-2.5 py-1.5 text-xs");

/** Admin moderation queue: review reports, then resolve, dismiss, warn or suspend. */
export default function AdminReportsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.ADMIN;

  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("status");
  const tab = TABS.some((t) => t.key === raw) ? raw : "ALL";
  const status = tab === "ALL" ? null : tab;

  const list = usePagedList(({ page, size }) => reportApi.getReportQueue({ status, page, size }), {
    listKey: "reports",
    deps: [status],
    fallback: "Could not load the report queue.",
  });

  const [flagged, setFlagged] = useState([]);
  const [flaggedKey, setFlaggedKey] = useState(0);
  useEffect(() => {
    let active = true;
    reportApi
      .getFlaggedPharmacies()
      .then((rows) => {
        if (!active) return;
        rows.forEach((f) => rememberPharmacyName(f.pharmacyId, f.pharmacyName));
        setFlagged(rows);
      })
      .catch(() => {
        if (active) setFlagged([]);
      });
    return () => {
      active = false;
    };
  }, [flaggedKey]);

  const nameOf = usePharmacyNames(list.items.map((r) => r.pharmacyId), { enabled: isSuperAdmin });
  const pharmacyLabel = (id) => nameOf(id) ?? flagged.find((f) => f.pharmacyId === id)?.pharmacyName ?? `Pharmacy ${shortId(id)}`;

  const [dialog, setDialog] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);

  const reloadList = list.reload;
  const refresh = useCallback(() => {
    reloadList();
    setFlaggedKey((k) => k + 1);
  }, [reloadList]);

  const resolve = (r) =>
    setDialog({
      title: "Resolve report",
      description: "Close this report as addressed. The customer who filed it is notified.",
      fieldLabel: "Decision note",
      placeholder: "What did you decide, and why?",
      confirmLabel: "Resolve report",
      run: async ({ text }) => {
        await reportApi.resolveReport(r.id, text);
        toast.success("Report resolved.");
        refresh();
      },
    });

  const dismiss = (r) =>
    setDialog({
      title: "Dismiss report",
      description: "Close this report as unfounded. The customer is told it was reviewed.",
      fieldLabel: "Reason",
      placeholder: "Why is this report being dismissed?",
      confirmLabel: "Dismiss report",
      danger: true,
      run: async ({ text }) => {
        await reportApi.dismissReport(r.id, text);
        toast.success("Report dismissed.");
        refresh();
      },
    });

  const warn = (pharmacyId) =>
    setDialog({
      title: `Warn ${pharmacyLabel(pharmacyId)}`,
      description: "Records a strike against the pharmacy and notifies it of the warning.",
      fieldLabel: "Reason",
      placeholder: "What is the warning for?",
      confirmLabel: "Send warning",
      danger: true,
      run: async ({ text }) => {
        await reportApi.warnPharmacy(pharmacyId, text);
        toast.success("Warning sent.");
        refresh();
      },
    });

  const suspend = (pharmacyId) =>
    setDialog({
      title: `Suspend ${pharmacyLabel(pharmacyId)}`,
      description: "Temporarily suspends the pharmacy and notifies it. Leave the duration empty to use the default.",
      fieldLabel: "Reason",
      placeholder: "Why is this pharmacy being suspended?",
      confirmLabel: "Suspend pharmacy",
      danger: true,
      withDays: true,
      run: async ({ text, days }) => {
        await reportApi.suspendPharmacy(pharmacyId, { days, reason: text });
        toast.success("Pharmacy suspended.");
        refresh();
      },
    });

  const lift = (pharmacyId) =>
    setDialog({
      title: `Lift suspension for ${pharmacyLabel(pharmacyId)}`,
      description: "Ends the pharmacy's suspension now instead of waiting for it to run out.",
      confirmLabel: "Lift suspension",
      noNote: true,
      run: async () => {
        await reportApi.liftSuspension(pharmacyId);
        toast.success("Suspension lifted.");
        refresh();
      },
    });

  const pharmacyActions = (pharmacyId) => (
    <>
      <button onClick={() => warn(pharmacyId)} className={smallBtn}>
        <AlertTriangleIcon className="size-3.5 text-amber-600" /> Warn
      </button>
      <button onClick={() => suspend(pharmacyId)} className={smallBtn}>
        <BanIcon className="size-3.5 text-rose-600" /> Suspend
      </button>
      <button onClick={() => lift(pharmacyId)} className={smallBtn}>
        <UnlockIcon className="size-3.5 text-emerald-600" /> Lift
      </button>
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reports"
        subtitle={`${list.meta.totalElements} report${list.meta.totalElements === 1 ? "" : "s"}${status ? " in this view" : ""}`}
      >
        {isSuperAdmin && (
          <button onClick={() => setAdminOpen(true)} className={ghostBtn}>
            <UserPlusIcon className="size-3.5" /> Add moderator
          </button>
        )}
      </PageHeader>

      {flagged.length > 0 && (
        <section className={cn(cardClass, "p-4")}>
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <AlertTriangleIcon className="size-4 text-amber-600" /> Most reported pharmacies
          </p>
          <ul className="flex flex-col divide-y divide-foreground/5">
            {flagged.map((f) => (
              <li key={f.pharmacyId} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {f.pharmacyName ?? `Pharmacy ${shortId(f.pharmacyId)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {f.unresolvedReports} unresolved report{f.unresolvedReports === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">{pharmacyActions(f.pharmacyId)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Tabs tabs={TABS} active={tab} onChange={(key) => setSearchParams({ status: key })} />

      <ListState
        loading={list.loading}
        error={list.error}
        isEmpty={list.items.length === 0}
        empty={{ icon: FlagIcon, title: "No reports here", subtitle: "Nothing to review for this filter." }}
      >
        <div className="flex flex-col gap-3">
          {list.items.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              heading={pharmacyLabel(r.pharmacyId)}
              meta={
                r.pharmacyReportCount != null
                  ? `${r.pharmacyReportCount} report${r.pharmacyReportCount === 1 ? "" : "s"} against this pharmacy`
                  : null
              }
              actions={
                <>
                  {isUnresolved(r.status) && (
                    <>
                      <button
                        onClick={() => resolve(r)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                      >
                        <CheckIcon className="size-3.5" /> Resolve
                      </button>
                      <button
                        onClick={() => dismiss(r)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600/10 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-600/20"
                      >
                        <XIcon className="size-3.5" /> Dismiss
                      </button>
                    </>
                  )}
                  {pharmacyActions(r.pharmacyId)}
                </>
              }
            />
          ))}
        </div>
      </ListState>

      <Pagination page={list.page} totalPages={list.meta.totalPages} loading={list.loading} onChange={list.setPage} />

      <NoteDialog config={dialog} onClose={() => setDialog(null)} />
      {isSuperAdmin && <CreateReportAdminDialog open={adminOpen} onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
