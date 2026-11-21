import { useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, UserCogIcon, UserPlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createStaff, updateStaff } from "@/features/staff/api/staffApi";
import { STAFF_LIMITS, permissionMeta } from "@/features/staff/constants";
import { ErrorBanner } from "@/components/common/PageBits";
import { primaryBtn, fieldClass, labelClass } from "@/components/common/styles";
import { extractApiError } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

function initialForm(staff) {
  return {
    fullName: staff?.fullName ?? "",
    jobTitle: staff?.jobTitle ?? "",
    email: staff?.email ?? "",
    password: "",
    permissions: staff?.permissions ?? [],
  };
}

/**
 * Owner dialog to add a staff member, or edit one when `staff` is given.
 * `permissionOptions` is the list from GET /pharmacy/staff/permissions.
 *
 * The form reads `staff` only when it mounts, so the parent gives it a new
 * `key` each time it opens.
 */
export default function StaffFormDialog({ open, staff, permissionOptions, onClose, onSaved }) {
  const isEdit = Boolean(staff);
  const [form, setForm] = useState(() => initialForm(staff));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Keep any permission the account already has, even if the list did not load.
  const options = [...new Set([...permissionOptions, ...(staff?.permissions ?? [])])];
  const allSelected = options.length > 0 && options.every((p) => form.permissions.includes(p));

  function togglePermission(permission) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(permission)
        ? f.permissions.filter((p) => p !== permission)
        : [...f.permissions, permission],
    }));
  }

  function handleOpenChange(next) {
    if (next || submitting) return;
    setError("");
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fullName = form.fullName.trim();
    const jobTitle = form.jobTitle.trim();
    const email = form.email.trim();
    if (!fullName) return setError("Enter the staff member's full name.");
    if (!isEdit) {
      if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
      if (form.password.length < STAFF_LIMITS.PASSWORD_MIN) {
        return setError(`The password must be at least ${STAFF_LIMITS.PASSWORD_MIN} characters.`);
      }
    }

    setError("");
    setSubmitting(true);
    try {
      const saved = isEdit
        ? await updateStaff(staff.id, { fullName, jobTitle, permissions: form.permissions })
        : await createStaff({ email, password: form.password, fullName, jobTitle, permissions: form.permissions });
      toast.success(isEdit ? `${saved.fullName} updated.` : `Staff account created for ${saved.email}.`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(extractApiError(err, isEdit ? "Could not save the changes." : "Could not create the staff account."));
    } finally {
      setSubmitting(false);
    }
  }

  const Icon = isEdit ? UserCogIcon : UserPlusIcon;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-5 text-indigo-600" />
            {isEdit ? "Edit staff member" : "Add staff member"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Change their details and what they are allowed to do. Changes can take a few minutes to reach someone who is signed in."
              : "They sign in with this email and password. Choose what they are allowed to do."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="staff-name" className={labelClass}>Full name</label>
              <input
                id="staff-name"
                value={form.fullName}
                onChange={set("fullName")}
                maxLength={STAFF_LIMITS.FULL_NAME_MAX}
                className={fieldClass}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="staff-title" className={labelClass}>
                Job title
                <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="staff-title"
                value={form.jobTitle}
                onChange={set("jobTitle")}
                maxLength={STAFF_LIMITS.JOB_TITLE_MAX}
                placeholder="Cashier"
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="staff-email" className={labelClass}>Email</label>
            <input
              id="staff-email"
              type="email"
              value={form.email}
              onChange={set("email")}
              maxLength={STAFF_LIMITS.EMAIL_MAX}
              autoComplete="off"
              disabled={isEdit}
              className={cn(fieldClass, isEdit && "cursor-not-allowed opacity-60")}
            />
            {isEdit && (
              <p className="mt-1 text-[11px] text-muted-foreground">The email and password cannot be changed here.</p>
            )}
          </div>

          {!isEdit && (
            <div>
              <label htmlFor="staff-password" className={labelClass}>Password</label>
              <input
                id="staff-password"
                type="password"
                value={form.password}
                onChange={set("password")}
                autoComplete="new-password"
                placeholder={`At least ${STAFF_LIMITS.PASSWORD_MIN} characters`}
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Give this password to the staff member. It cannot be changed later.
              </p>
            </div>
          )}

          <fieldset>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <legend className="text-sm font-medium text-foreground">Permissions</legend>
              {options.length > 0 && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, permissions: allSelected ? [] : options }))}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  {allSelected ? "Clear all" : "Select all"}
                </button>
              )}
            </div>

            {options.length === 0 ? (
              <p className="rounded-xl border border-foreground/10 px-3 py-3 text-sm text-muted-foreground">
                The list of permissions could not be loaded. Close this and try again.
              </p>
            ) : (
              <div className="divide-y divide-foreground/5 rounded-xl border border-foreground/10">
                {options.map((permission) => {
                  const meta = permissionMeta(permission);
                  return (
                    <label
                      key={permission}
                      className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="mt-0.5 size-4 shrink-0 accent-indigo-600"
                      />
                      <span>
                        <span className="block text-sm font-medium text-foreground">{meta.label}</span>
                        {meta.description && (
                          <span className="block text-xs text-muted-foreground">{meta.description}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {options.length > 0 && form.permissions.length === 0 && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                With nothing selected, this person can sign in but cannot do anything.
              </p>
            )}
          </fieldset>

          <ErrorBanner>{error}</ErrorBanner>

          <button type="submit" disabled={submitting} className={cn(primaryBtn, "h-11 w-full")}>
            {submitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" /> Saving…
              </>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Add staff member"
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
