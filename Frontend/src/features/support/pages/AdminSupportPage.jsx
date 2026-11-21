import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LifeBuoyIcon, CheckIcon, XIcon } from "lucide-react";
import * as supportApi from "@/features/support/api/supportApi";
import TicketCard from "@/features/support/components/TicketCard";
import { isUnresolved } from "@/features/reports/constants";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader, Tabs } from "@/components/common/PageBits";
import ListState from "@/components/common/ListState";
import NoteDialog from "@/components/common/NoteDialog";
import Pagination from "@/components/common/Pagination";
import { shortId } from "@/lib/helpers/helpers";

const TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "UNDER_REVIEW", label: "Under review" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "DISMISSED", label: "Dismissed" },
];

const roleLabel = (role) => {
  const r = (role ?? "").replace(/^ROLE_/, "");
  if (r === "PHARMACY") return "Pharmacy";
  if (r === "CUSTOMER") return "Customer";
  return r || "User";
};

/** Admin queue of support tickets opened by customers and pharmacies. */
export default function AdminSupportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("status");
  const tab = TABS.some((t) => t.key === raw) ? raw : "ALL";
  const status = tab === "ALL" ? null : tab;

  const list = usePagedList(({ page, size }) => supportApi.getTicketQueue({ status, page, size }), {
    listKey: "tickets",
    deps: [status],
    fallback: "Could not load support tickets.",
  });

  const [dialog, setDialog] = useState(null);

  const resolve = (t) =>
    setDialog({
      title: "Resolve ticket",
      description: "Your reply is shown to the person who opened the ticket.",
      fieldLabel: "Reply",
      placeholder: "Explain what was fixed or what they should do…",
      confirmLabel: "Resolve ticket",
      run: async ({ text }) => {
        await supportApi.resolveTicket(t.id, text);
        toast.success("Ticket resolved.");
        list.reload();
      },
    });

  const dismiss = (t) =>
    setDialog({
      title: "Dismiss ticket",
      description: "Close this ticket without a fix. Your reply is shown to the person who opened it.",
      fieldLabel: "Reason",
      placeholder: "Why is this ticket being closed?",
      confirmLabel: "Dismiss ticket",
      danger: true,
      run: async ({ text }) => {
        await supportApi.dismissTicket(t.id, text);
        toast.success("Ticket dismissed.");
        list.reload();
      },
    });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Support Tickets"
        subtitle={`${list.meta.totalElements} ticket${list.meta.totalElements === 1 ? "" : "s"}${status ? " in this view" : ""}`}
      />

      <Tabs tabs={TABS} active={tab} onChange={(key) => setSearchParams({ status: key })} />

      <ListState
        loading={list.loading}
        error={list.error}
        isEmpty={list.items.length === 0}
        empty={{ icon: LifeBuoyIcon, title: "No tickets here", subtitle: "Nothing to review for this filter." }}
      >
        <div className="flex flex-col gap-3">
          {list.items.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              meta={`${roleLabel(t.reporterRole)} ${shortId(t.reporterId)}`}
              actions={
                isUnresolved(t.status) ? (
                  <>
                    <button
                      onClick={() => resolve(t)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                    >
                      <CheckIcon className="size-3.5" /> Resolve
                    </button>
                    <button
                      onClick={() => dismiss(t)}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-600/10 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-600/20"
                    >
                      <XIcon className="size-3.5" /> Dismiss
                    </button>
                  </>
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
