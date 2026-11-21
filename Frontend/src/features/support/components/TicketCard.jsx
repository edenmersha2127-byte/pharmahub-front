import { ShieldCheckIcon } from "lucide-react";
import ReportStatusBadge from "@/features/reports/components/ReportStatusBadge";
import { issueCategoryMeta } from "@/features/support/constants";
import { formatDateTime, timeAgo } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

/** One support ticket with the admin's reply, if any. */
export default function TicketCard({ ticket, meta, actions }) {
  const category = issueCategoryMeta(ticket.category);
  const Icon = category.icon;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-foreground/5 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", category.tone)}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{ticket.subject}</p>
            <p className="text-sm text-muted-foreground">{category.label}</p>
          </div>
        </div>
        <ReportStatusBadge status={ticket.status} />
      </div>

      <p className="whitespace-pre-wrap text-sm text-foreground">{ticket.description}</p>

      {ticket.adminResponse && (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-emerald-700">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
            <ShieldCheckIcon className="size-3.5" /> Support team reply
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground">{ticket.adminResponse}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/5 pt-3">
        <p className="text-xs text-muted-foreground" title={formatDateTime(ticket.createdAt)}>
          Opened {timeAgo(ticket.createdAt) || formatDateTime(ticket.createdAt)}
          {meta ? ` · ${meta}` : ""}
        </p>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
    </article>
  );
}
