import axiosInstance from "@/lib/axios/axiosInstance";

/**
 * Support tickets (report-service /issues): customers and pharmacies report
 * software or experience problems to the admin team.
 */

/** @param category one of ISSUE_CATEGORIES values */
export async function submitTicket({ category, subject, description }) {
  const { data } = await axiosInstance.post("/issues", { category, subject, description });
  return data;
}

/** Tickets the current user has opened: { tickets, page, size, totalElements, totalPages }. */
export async function getMyTickets({ page = 0, size = 20 } = {}) {
  const { data } = await axiosInstance.get("/issues/mine", { params: { page, size } });
  return data;
}

// ---- Admin ----------------------------------------------------------------

export async function getTicketQueue({ status = null, page = 0, size = 20 } = {}) {
  const params = { page, size };
  if (status) params.status = status;
  const { data } = await axiosInstance.get("/admin/issues", { params });
  return data;
}

export async function resolveTicket(id, note) {
  const { data } = await axiosInstance.post(`/admin/issues/${id}/resolve`, note ? { note } : {});
  return data;
}

export async function dismissTicket(id, note) {
  const { data } = await axiosInstance.post(`/admin/issues/${id}/dismiss`, note ? { note } : {});
  return data;
}
