import { useState } from "react";
import { toast } from "sonner";
import { FlagIcon, MessageSquareReplyIcon } from "lucide-react";
import { getReportsAgainstMe, respondToReport } from "@/features/reports/api/reportApi";
import ReportCard from "@/features/reports/components/ReportCard";
import { isUnresolved } from "@/features/reports/constants";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader } from "@/components/common/PageBits";
import ListState from "@/components/common/ListState";
import NoteDialog from "@/components/common/NoteDialog";
import Pagination from "@/components/common/Pagination";
import { primaryBtn } from "@/components/common/styles";
import { cn } from "@/lib/utils";

/** Pharmacy view of customer reports filed against it, with the right to respond. */
export default function PharmacyReportsPage() {
  const list = usePagedList(getReportsAgainstMe, { listKey: "reports", fallback: "Could not load reports." });
  const [dialog, setDialog] = useState(null);

  const open = list.items.filter((r) => isUnresolved(r.status) && !r.pharmacyResponse).length;

  function respond(report) {
    setDialog({
      title: "Respond to this report",
      description: "Your side of the story is shown to the admin before any decision is made.",
      fieldLabel: "Your response",
      placeholder: "Explain what happened from your side…",
      confirmLabel: "Send response",
      required: true,
      run: async ({ text }) => {
        await respondToReport(report.id, text);
        toast.success("Response sent to the admin.");
        list.reload();
      },
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Customer Reports"
        subtitle={
          list.loading
            ? "Reports customers filed about your pharmacy."
            : `${list.meta.totalElements} report${list.meta.totalElements === 1 ? "" : "s"}${open ? ` · ${open} need${open === 1 ? "s" : ""} your response` : ""}`
        }
      />

      <ListState
        loading={list.loading}
        error={list.error}
        isEmpty={list.items.length === 0}
        empty={{ icon: FlagIcon, title: "No reports against you", subtitle: "Customers have not reported any issues with your pharmacy." }}
      >
        <div className="flex flex-col gap-3">
          {list.items.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              actions={
                isUnresolved(r.status) && !r.pharmacyResponse ? (
                  <button onClick={() => respond(r)} className={cn(primaryBtn, "px-3 py-1.5 text-xs shadow-none")}>
                    <MessageSquareReplyIcon className="size-3.5" /> Respond
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      </ListState>

      <Pagination page={list.page} totalPages={list.meta.totalPages} loading={list.loading} onChange={list.setPage} />

      <NoteDialog config={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
