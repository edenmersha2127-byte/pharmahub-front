import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, UsersIcon } from "lucide-react";
import * as staffApi from "@/features/staff/api/staffApi";
import { permissionMeta, staffStatusTone } from "@/features/staff/constants";
import StaffFormDialog from "@/features/staff/components/StaffFormDialog";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader, Tabs, ErrorBanner, Badge } from "@/components/common/PageBits";
import DataTable from "@/components/common/DataTable";
import NoteDialog from "@/components/common/NoteDialog";
import { primaryBtn, ghostBtn } from "@/components/common/styles";
import { extractApiError, formatDate } from "@/lib/helpers/helpers";

const MAX_CHIPS = 3;

function PermissionsCell({ permissions }) {
  const list = permissions ?? [];
  if (list.length === 0) return <span className="text-muted-foreground">None</span>;
  const rest = list.slice(MAX_CHIPS);
  return (
    <div className="flex max-w-xs flex-wrap gap-1">
      {list.slice(0, MAX_CHIPS).map((p) => (
        <span key={p} className="whitespace-nowrap rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">
          {permissionMeta(p).label}
        </span>
      ))}
      {rest.length > 0 && (
        <span
          title={rest.map((p) => permissionMeta(p).label).join(", ")}
          className="whitespace-nowrap rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
        >
          +{rest.length} more
        </span>
      )}
    </div>
  );
}

/** Pharmacy owner: staff accounts and what each one is allowed to do. */
export default function StaffPage() {
  // The endpoint returns the whole list at once; usePagedList handles a plain array.
  const list = usePagedList(staffApi.listStaff, { fallback: "Could not load your staff." });

  const [permissionOptions, setPermissionOptions] = useState([]);
  const [permissionError, setPermissionError] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ open: false, staff: null, key: 0 });
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await staffApi.getPermissions();
        if (active) setPermissionOptions(data);
      } catch (e) {
        if (active) setPermissionError(extractApiError(e, "Could not load the list of permissions."));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const openForm = (staff) => setForm((f) => ({ open: true, staff, key: f.key + 1 }));

  function askToggle(staff) {
    const deactivate = staff.active;
    setConfirm({
      noNote: true,
      danger: deactivate,
      title: deactivate ? `Deactivate ${staff.fullName}?` : `Activate ${staff.fullName}?`,
      description: deactivate
        ? "They will not be able to sign in until you activate them again. Someone who is already signed in may stay signed in for a while."
        : "They will be able to sign in again with the same email and password.",
      confirmLabel: deactivate ? "Deactivate" : "Activate",
      run: async () => {
        if (deactivate) await staffApi.deactivateStaff(staff.id);
        else await staffApi.activateStaff(staff.id);
        toast.success(deactivate ? `${staff.fullName} deactivated.` : `${staff.fullName} activated.`);
        list.reload();
      },
    });
  }

  const activeCount = list.items.filter((s) => s.active).length;
  const tabs = [
    { key: "all", label: "All", count: list.items.length },
    { key: "active", label: "Active", count: activeCount },
    { key: "inactive", label: "Deactivated", count: list.items.length - activeCount },
  ];
  const rows = list.items.filter((s) => filter === "all" || (filter === "active" ? s.active : !s.active));

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (s) => (
        <>
          <span className="font-medium text-foreground">{s.fullName}</span>
          <span className="block text-xs text-muted-foreground">{s.email}</span>
        </>
      ),
    },
    { key: "job", header: "Job title", className: "text-muted-foreground", cell: (s) => s.jobTitle || "—" },
    { key: "permissions", header: "Permissions", cell: (s) => <PermissionsCell permissions={s.permissions} /> },
    { key: "status", header: "Status", cell: (s) => <Badge tone={staffStatusTone(s.active)} /> },
    { key: "added", header: "Added", className: "text-muted-foreground", cell: (s) => formatDate(s.createdAt) },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (s) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => openForm(s)} className={ghostBtn}>
            <PencilIcon className="size-3.5" /> Edit
          </button>
          <button onClick={() => askToggle(s)} className={ghostBtn}>
            {s.active ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  const empty =
    filter === "all"
      ? { icon: UsersIcon, title: "No staff yet", subtitle: "Add a staff member so they can sign in and help run the pharmacy." }
      : { icon: UsersIcon, title: filter === "active" ? "No active staff" : "No deactivated staff" };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Staff" subtitle="Give your employees their own sign-in and choose what each one can do.">
        <button onClick={() => openForm(null)} className={primaryBtn}>
          <PlusIcon className="size-4" /> Add staff member
        </button>
      </PageHeader>

      <Tabs tabs={tabs} active={filter} onChange={setFilter} />

      <ErrorBanner>{list.error || permissionError}</ErrorBanner>
      <DataTable
        columns={columns}
        rows={rows}
        loading={list.loading}
        hideEmpty={Boolean(list.error)}
        loadingText="Loading staff…"
        empty={empty}
      />

      <StaffFormDialog
        key={form.key}
        open={form.open}
        staff={form.staff}
        permissionOptions={permissionOptions}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSaved={list.reload}
      />
      <NoteDialog config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
