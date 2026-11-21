import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PlusIcon, TruckIcon, PencilIcon, Trash2Icon, SearchIcon, ClipboardListIcon } from "lucide-react";
import * as purchasingApi from "@/features/purchasing/api/purchasingApi";
import SupplierFormDialog from "@/features/purchasing/components/SupplierFormDialog";
import SaveError from "@/features/purchasing/components/SaveError";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader, ErrorBanner } from "@/components/common/PageBits";
import DataTable from "@/components/common/DataTable";
import NoteDialog from "@/components/common/NoteDialog";
import { primaryBtn, ghostBtn, fieldClass } from "@/components/common/styles";
import { formatDate, parseApiError } from "@/lib/helpers/helpers";
import { PATHS } from "@/router/routes";
import { cn } from "@/lib/utils";

const smallBtn = cn(ghostBtn, "px-2.5 py-1.5 text-xs");

/** Pharmacy supplier book: list, add, edit and delete suppliers. */
export default function SuppliersPage() {
  const { user } = useAuth();
  const pharmacyId = user?.userId;

  const list = usePagedList(() => (pharmacyId ? purchasingApi.getSuppliers(pharmacyId) : []), {
    deps: [pharmacyId],
    fallback: "Could not load suppliers.",
  });

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // { supplier } — supplier null = add
  const [confirm, setConfirm] = useState(null);
  const [actionError, setActionError] = useState(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list.items;
    return list.items.filter((s) =>
      [s.name, s.phone, s.email, s.address].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [list.items, search]);

  const remove = (s) =>
    setConfirm({
      title: `Delete ${s.name}?`,
      description:
        "This removes the supplier from your list. Past orders are kept, but they will no longer show this supplier's name.",
      confirmLabel: "Delete supplier",
      danger: true,
      noNote: true,
      run: async () => {
        setActionError(null);
        try {
          await purchasingApi.deleteSupplier(pharmacyId, s.id);
        } catch (err) {
          const parsed = parseApiError(err, "Could not delete the supplier. Please try again.");
          // Shown on the page (not in the dialog) so it can link to the plans.
          if (parsed.subscriptionRequired) return setActionError(parsed);
          throw err;
        }
        toast.success("Supplier deleted.");
        list.reload();
      },
    });

  const columns = [
    {
      key: "name",
      header: "Supplier",
      className: "whitespace-normal",
      cell: (s) => (
        <>
          <span className="font-medium text-foreground">{s.name}</span>
          {s.note && <span className="block max-w-xs text-xs text-muted-foreground">{s.note}</span>}
        </>
      ),
    },
    { key: "phone", header: "Phone", className: "text-muted-foreground", cell: (s) => s.phone || "—" },
    { key: "email", header: "Email", className: "text-muted-foreground", cell: (s) => s.email || "—" },
    {
      key: "address",
      header: "Address",
      className: "max-w-56 whitespace-normal text-muted-foreground",
      cell: (s) => s.address || "—",
    },
    { key: "added", header: "Added", className: "text-muted-foreground", cell: (s) => formatDate(s.createdAt) },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => setEditing({ supplier: s })} className={smallBtn}>
            <PencilIcon className="size-3.5" /> Edit
          </button>
          <button onClick={() => remove(s)} className={smallBtn}>
            <Trash2Icon className="size-3.5 text-rose-600" /> Delete
          </button>
        </div>
      ),
    },
  ];

  const total = list.items.length;
  const searching = search.trim() !== "";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Suppliers"
        subtitle={list.loading ? "The companies you buy stock from." : `${total} supplier${total === 1 ? "" : "s"}`}
      >
        <Link to={PATHS.PHARMACY_PURCHASES} className={ghostBtn}>
          <ClipboardListIcon className="size-3.5" /> Purchase orders
        </Link>
        <button onClick={() => setEditing({ supplier: null })} className={primaryBtn}>
          <PlusIcon className="size-4" /> Add supplier
        </button>
      </PageHeader>

      {total > 0 && (
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers…"
            aria-label="Search suppliers"
            className={cn(fieldClass, "pl-9")}
          />
        </div>
      )}

      <SaveError error={actionError} />
      <ErrorBanner>{list.error}</ErrorBanner>

      <DataTable
        columns={columns}
        rows={rows}
        loading={list.loading}
        hideEmpty={Boolean(list.error)}
        loadingText="Loading suppliers…"
        empty={
          searching
            ? { icon: SearchIcon, title: "No suppliers match", subtitle: "Try a different name, phone or email." }
            : { icon: TruckIcon, title: "No suppliers yet", subtitle: "Add the companies you buy stock from." }
        }
      />

      {editing && (
        <SupplierFormDialog
          key={editing.supplier?.id ?? "new"}
          pharmacyId={pharmacyId}
          supplier={editing.supplier}
          onClose={() => setEditing(null)}
          onSaved={list.reload}
        />
      )}
      <NoteDialog config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
