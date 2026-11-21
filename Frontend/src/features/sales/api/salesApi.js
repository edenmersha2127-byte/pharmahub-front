import axiosInstance from "@/lib/axios/axiosInstance";

/**
 * Point-of-sale API (sales-service, behind the gateway JwtAuth filter).
 * The pharmacy is taken from the signed-in account, so none of the sales
 * endpoints take a pharmacyId. Only the inventory lookups at the bottom do.
 */

// ---- Checkout -------------------------------------------------------------

/**
 * Record a sale and deduct its stock (all lines or none).
 * @param paymentMethod CASH | CARD | MOBILE_MONEY
 * @param items [{ medicineId, quantity }] — at least one, quantity >= 1
 * @param customerId optional walk-in customer of this pharmacy
 * @returns receipt { saleId, pharmacyId, customerId, cashierId, paymentMethod,
 *          total, createdAt, items: [{ medicineId, medicineName, quantity, unitPrice, lineTotal }] }
 */
export async function checkout({ paymentMethod, items, customerId }) {
  const body = { paymentMethod, items };
  if (customerId) body.customerId = customerId;
  const { data } = await axiosInstance.post("/pos/checkout", body);
  return data;
}

// ---- Sales history and reports --------------------------------------------

/**
 * Every sale of the pharmacy, newest first. The backend returns the whole list
 * (no paging, no filters): [{ saleId, customerId, paymentMethod, total, createdAt }].
 */
export async function getSales() {
  const { data } = await axiosInstance.get("/sales");
  return Array.isArray(data) ? data : [];
}

/**
 * Today's figures: { date, salesCount, totalRevenue, previousDayRevenue, revenueDeltaPct }.
 * `revenueDeltaPct` is null when yesterday had no revenue.
 */
export async function getTodaySummary() {
  const { data } = await axiosInstance.get("/sales/summary/today");
  return data;
}

function rangeParams(from, to) {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return params;
}

/**
 * Totals over an inclusive date range: { from, to, salesCount, revenue, profit }.
 * Dates are "YYYY-MM-DD"; the backend defaults to the current month so far.
 */
export async function getAnalytics({ from, to } = {}) {
  const { data } = await axiosInstance.get("/sales/analytics", { params: rangeParams(from, to) });
  return data;
}

/**
 * Best sellers by units sold: [{ medicineId, medicineName, quantitySold, revenue }].
 * @param limit 1–50 (backend default 10)
 */
export async function getTopMedicines({ from, to, limit = 10 } = {}) {
  const { data } = await axiosInstance.get("/sales/analytics/top-medicines", {
    params: { ...rangeParams(from, to), limit },
  });
  return Array.isArray(data) ? data : [];
}

/**
 * Sales trend, one entry per day or month with no gaps:
 * [{ period: "YYYY-MM-DD" | "YYYY-MM", salesCount, revenue, profit }].
 * @param granularity DAY | MONTH
 */
export async function getTimeseries({ from, to, granularity = "DAY" } = {}) {
  const { data } = await axiosInstance.get("/sales/analytics/timeseries", {
    params: { ...rangeParams(from, to), granularity },
  });
  return Array.isArray(data) ? data : [];
}

/** One sale with its line items (same shape as the checkout receipt). */
export async function getSale(saleId) {
  const { data } = await axiosInstance.get(`/sales/${saleId}`);
  return data;
}

// ---- Walk-in customers ----------------------------------------------------

/** All customers, newest first: [{ id, pharmacyId, name, phone, email, note, createdAt }]. */
export async function getCustomers() {
  const { data } = await axiosInstance.get("/pharmacy-customers");
  return Array.isArray(data) ? data : [];
}

/** A customer with their purchases: { customer, purchaseHistory: [sale summary] }. */
export async function getCustomer(customerId) {
  const { data } = await axiosInstance.get(`/pharmacy-customers/${customerId}`);
  return data;
}

/** @param payload { name (required), phone?, email?, note? } */
export async function createCustomer(payload) {
  const { data } = await axiosInstance.post("/pharmacy-customers", payload);
  return data;
}

export async function updateCustomer(customerId, payload) {
  const { data } = await axiosInstance.put(`/pharmacy-customers/${customerId}`, payload);
  return data;
}

export async function deleteCustomer(customerId) {
  const { data } = await axiosInstance.delete(`/pharmacy-customers/${customerId}`);
  return data;
}

// ---- Inventory lookups for the till (inventory-service) --------------------

/** In-stock medicines to browse: { medicines, page, size, totalElements, totalPages }. */
export async function getSellableMedicines(pharmacyId, { page = 0, size = 24 } = {}) {
  const { data } = await axiosInstance.get(`/inventory/pharmacies/${pharmacyId}/medicines`, {
    params: { availableOnly: true, page, size },
  });
  return data;
}

/** Search this pharmacy's medicines by name, generic name or brand. Returns a plain array. */
export async function lookupMedicines(pharmacyId, q) {
  const { data } = await axiosInstance.get(`/inventory/pharmacies/${pharmacyId}/medicines/lookup`, {
    params: { q },
  });
  return Array.isArray(data) ? data : [];
}

/** One medicine with its current price and stock. */
export async function getMedicine(pharmacyId, medicineId) {
  const { data } = await axiosInstance.get(`/inventory/pharmacies/${pharmacyId}/medicines/${medicineId}`);
  return data;
}

/** The medicine with this barcode, or null when the pharmacy has none. */
export async function getMedicineByBarcode(pharmacyId, barcode) {
  try {
    const { data } = await axiosInstance.get(
      `/inventory/pharmacies/${pharmacyId}/medicines/barcode/${encodeURIComponent(barcode)}`
    );
    return data;
  } catch (e) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}
