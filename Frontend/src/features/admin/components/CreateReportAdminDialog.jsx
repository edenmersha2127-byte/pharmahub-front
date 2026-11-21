import { useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, UserPlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createReportAdmin } from "@/features/admin/api/adminApi";
import { ErrorBanner } from "@/components/common/PageBits";
import { primaryBtn, fieldClass, labelClass } from "@/components/common/styles";
import { extractApiError } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

const EMPTY = { firstName: "", lastName: "", email: "", password: "" };

/** Super-admin dialog to create a moderator (REPORT_ADMIN) account. */
export default function CreateReportAdminDialog({ open, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function handleOpenChange(next) {
    if (next) return;
    setForm(EMPTY);
    setError("");
    setSubmitting(false);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
    };
    if (!payload.firstName || !payload.lastName) return setError("Enter the moderator's first and last name.");
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) return setError("Enter a valid email address.");
    if (payload.password.length < 8) return setError("The password must be at least 8 characters.");

    setError("");
    setSubmitting(true);
    try {
      const account = await createReportAdmin(payload);
      toast.success(`Moderator account created for ${account.email}.`);
      handleOpenChange(false);
    } catch (err) {
      setError(extractApiError(err, "Could not create the moderator account."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlusIcon className="size-5 text-indigo-600" />
            New moderator
          </DialogTitle>
          <DialogDescription>
            Moderators can review reports and support tickets. They cannot manage users, pharmacies or billing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ra-first" className={labelClass}>First name</label>
              <input id="ra-first" value={form.firstName} onChange={set("firstName")} maxLength={100} className={fieldClass} autoFocus />
            </div>
            <div>
              <label htmlFor="ra-last" className={labelClass}>Last name</label>
              <input id="ra-last" value={form.lastName} onChange={set("lastName")} maxLength={100} className={fieldClass} />
            </div>
          </div>
          <div>
            <label htmlFor="ra-email" className={labelClass}>Email</label>
            <input id="ra-email" type="email" value={form.email} onChange={set("email")} autoComplete="off" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="ra-password" className={labelClass}>Temporary password</label>
            <input
              id="ra-password"
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={fieldClass}
            />
          </div>

          <ErrorBanner>{error}</ErrorBanner>

          <button type="submit" disabled={submitting} className={cn(primaryBtn, "h-11 w-full")}>
            {submitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" /> Creating…
              </>
            ) : (
              "Create moderator"
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
