import { useState } from "react";
import { toast } from "sonner";
import { HistoryIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon, UsersRoundIcon } from "lucide-react";
import { deleteCustomer } from "@/features/sales/api/salesApi";
import { PAGE_SIZE } from "@/features/sales/constants";
import { useCustomers } from "@/features/sales/hooks/useCustomers";
import CustomerFormDialog from "@/features/sales/components/CustomerFormDialog";
import CustomerHistoryDialog from "@/features/sales/components/CustomerHistoryDialog";
import { PageHeader, ErrorBanner } from "@/components/common/PageBits";
import DataTable from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import NoteDialog from "@/components/common/NoteDialog";
import { primaryBtn, ghostBtn, fieldClass } from "@/components/common/styles";
import { formatDate } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

/** The pharmacy's own walk-in customers: list, add, edit, delete, purchase history. */
export default function PharmacyCustomersPage() {
  const { customers, loading, error, reload } = useCustomers();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState(null); // { customer: object | null } while the form is open
  const [history, setHistory] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter((c) => [c.name, c.phone, c.email].filter(Boolean).some((v) => v.toLowerCase().includes(q)))
    : customers;

  // The backend returns the whole list, so paging happens here.
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function askDelete(customer) {
    setConfirm({
      title: "Delete customer",
      description: `This removes ${customer.name} from your customer list. Their past sales stay in your sales history. This cannot be undone.`,
      confirmLabel: "Delete customer",
      danger: true,
      noNote: true,
      run: async () => {
        await deleteCustomer(customer.id);
        toast.success("Customer deleted.");
        reload();
      },
    });
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (c) => (
        <>
          <span className="font-medium text-foreground">{c.name}</span>
          {c.note && <span className="block max-w-xs truncate text-xs text-muted-foreground" title={c.note}>{c.note}</span>}
        </>
      ),
    },
    { key: "phone", header: "Phone", className: "text-muted-foreground", cell: (c) => c.phone || "—" },
    { key: "email", header: "Email", className: "text-muted-foreground", cell: (c) => c.email || "—" },
    { key: "added", header: "Added", className: "text-muted-foreground", cell: (c) => formatDate(c.createdAt) },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (c) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => setHistory(c)} className={ghostBtn}>
            <HistoryIcon className="size-3.5" /> Purchases
          </button>
          <button onClick={() => setForm({ customer: c })} className={ghostBtn}>
            <PencilIcon className="size-3.5" /> Edit
          </button>
          <button
            onClick={() => askDelete(c)}
            className={cn(ghostBtn, "hover:border-rose-500/40 hover:text-rose-600")}
          >
            <Trash2Icon className="size-3.5" /> Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Customers" subtitle="People who buy from your pharmacy in person.">
        <button onClick={() => setForm({ customer: null })} className={primaryBtn}>
          <PlusIcon className="size-4" /> New customer
        </button>
      </PageHeader>

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search by name, phone or email"
          aria-label="Search customers"
          className={cn(fieldClass, "pl-9")}
        />
      </div>

      <ErrorBanner>{error}</ErrorBanner>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        hideEmpty={Boolean(error)}
        loadingText="Loading customers…"
        empty={
          q
            ? { icon: SearchIcon, title: "No customers match", subtitle: "Try a different name, phone or email." }
            : { icon: UsersRoundIcon, title: "No customers yet", subtitle: "Add a customer to attach their purchases to them at the till." }
        }
      />
      <Pagination page={safePage} totalPages={totalPages} loading={loading} onChange={setPage} />

      <CustomerFormDialog
        open={Boolean(form)}
        customer={form?.customer ?? null}
        onClose={() => setForm(null)}
        onSaved={reload}
      />
      <CustomerHistoryDialog customer={history} onClose={() => setHistory(null)} />
      <NoteDialog config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
