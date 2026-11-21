import { useState } from "react";
import { LifeBuoyIcon, PlusIcon } from "lucide-react";
import { getMyTickets } from "@/features/support/api/supportApi";
import TicketCard from "@/features/support/components/TicketCard";
import NewTicketDialog from "@/features/support/components/NewTicketDialog";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader } from "@/components/common/PageBits";
import ListState from "@/components/common/ListState";
import Pagination from "@/components/common/Pagination";
import { primaryBtn } from "@/components/common/styles";

/** Help & support for customers and pharmacies: open a ticket and follow replies. */
export default function SupportPage() {
  const list = usePagedList(getMyTickets, { listKey: "tickets", fallback: "Could not load your tickets." });
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Help & Support" subtitle="Report a problem with PharmaHub and follow our replies.">
        <button onClick={() => setOpen(true)} className={primaryBtn}>
          <PlusIcon className="size-4" /> New ticket
        </button>
      </PageHeader>

      <ListState
        loading={list.loading}
        error={list.error}
        isEmpty={list.items.length === 0}
        empty={{
          icon: LifeBuoyIcon,
          title: "No tickets yet",
          subtitle: "If something is not working, open a ticket and our team will help.",
        }}
      >
        <div className="flex flex-col gap-3">
          {list.items.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      </ListState>

      <Pagination page={list.page} totalPages={list.meta.totalPages} loading={list.loading} onChange={list.setPage} />

      <NewTicketDialog open={open} onClose={() => setOpen(false)} onCreated={list.reload} />
    </div>
  );
}
