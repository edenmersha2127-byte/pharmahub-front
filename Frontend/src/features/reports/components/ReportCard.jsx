import { StoreIcon, ShieldCheckIcon } from "lucide-react";
import ReportStatusBadge from "@/features/reports/components/ReportStatusBadge";
import { categoryMeta } from "@/features/reports/constants";
import { formatDateTime, timeAgo } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

function Quote({ icon: Icon, title, tone, children }) {
  return (
    <div className={cn("rounded-xl border p-3", tone)}>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="size-3.5" /> {title}
      </p>
      <p className="whitespace-pre-wrap text-sm text-foreground">{children}</p>
    </div>
  );
}

/**
 * One report with its conversation: the customer's complaint, the pharmacy's
 * response and the admin's resolution note.
 *
 * @param heading  line shown above the description (e.g. the pharmacy name)
 * @param meta     extra muted text next to the date
 * @param actions  buttons rendered at the bottom
 */
export default function ReportCard({ report, heading, meta, actions }) {
  const category = categoryMeta(report.category);
  const Icon = category.icon;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-foreground/5 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", category.tone)}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{category.label}</p>
            {heading && <p className="truncate text-sm text-muted-foreground">{heading}</p>}
          </div>
        </div>
        <ReportStatusBadge status={report.status} />
      </div>

      <p className="whitespace-pre-wrap text-sm text-foreground">{report.description}</p>

      {report.pharmacyResponse && (
        <Quote icon={StoreIcon} title="Pharmacy response" tone="border-indigo-500/15 bg-indigo-500/5 text-indigo-700">
          {report.pharmacyResponse}
        </Quote>
      )}

      {report.resolutionNote && (
        <Quote icon={ShieldCheckIcon} title="Admin decision" tone="border-emerald-500/15 bg-emerald-500/5 text-emerald-700">
          {report.resolutionNote}
        </Quote>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/5 pt-3">
        <p className="text-xs text-muted-foreground" title={formatDateTime(report.createdAt)}>
          Filed {timeAgo(report.createdAt) || formatDateTime(report.createdAt)}
          {meta ? ` · ${meta}` : ""}
        </p>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
    </article>
  );
}
