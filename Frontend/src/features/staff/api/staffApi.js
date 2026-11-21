import axiosInstance from "@/lib/axios/axiosInstance";

/**
 * Pharmacy staff API (auth-service StaffController, behind the gateway JwtAuth
 * filter). Owner-only: every endpoint needs the PHARMACY role, and the backend
 * scopes each call to the signed-in owner's own pharmacy.
 *
 * A staff member looks like:
 * { id, pharmacyId, email, fullName, jobTitle, permissions: string[], active, createdAt }
 */

/** The permission names an owner can grant, e.g. ["SELL_MEDICINE", ...]. */
export async function getPermissions() {
  const { data } = await axiosInstance.get("/pharmacy/staff/permissions");
  return Array.isArray(data) ? data : [];
}

/** Every staff member of this pharmacy (plain array, not paged). */
export async function listStaff() {
  const { data } = await axiosInstance.get("/pharmacy/staff");
  return Array.isArray(data) ? data : [];
}

/**
 * Create a staff account. The new account is active straight away.
 * @param email       required, must be unique across all account types
 * @param password    required, at least 8 characters
 * @param fullName    required
 * @param jobTitle    optional free text (e.g. "Cashier")
 * @param permissions array of permission names; may be empty
 */
export async function createStaff({ email, password, fullName, jobTitle, permissions }) {
  const body = { email, password, fullName, permissions: permissions ?? [] };
  if (jobTitle) body.jobTitle = jobTitle;
  const { data } = await axiosInstance.post("/pharmacy/staff", body);
  return data;
}

/**
 * Update a staff member's name, job title and permissions. `permissions`
 * replaces the whole set; the job title is cleared when left empty. Email and
 * password cannot be changed.
 */
export async function updateStaff(staffId, { fullName, jobTitle, permissions }) {
  const body = { fullName, jobTitle: jobTitle || null, permissions: permissions ?? [] };
  const { data } = await axiosInstance.put(`/pharmacy/staff/${staffId}`, body);
  return data;
}

/** Block a staff member from signing in. Returns { message }. */
export async function deactivateStaff(staffId) {
  const { data } = await axiosInstance.post(`/pharmacy/staff/${staffId}/deactivate`);
  return data;
}

/** Let a deactivated staff member sign in again. Returns { message }. */
export async function activateStaff(staffId) {
  const { data } = await axiosInstance.post(`/pharmacy/staff/${staffId}/activate`);
  return data;
}
