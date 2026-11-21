import axiosInstance from "@/lib/axios/axiosInstance";

/**
 * Purchasing & stock insight API (inventory-service, behind the gateway).
 * Everything is scoped to one pharmacy: /inventory/pharmacies/{pharmacyId}/…
 *
 * None of these endpoints are paged — lists come back as plain arrays.
 * Write endpoints (suppliers and purchase orders) answer 402 when the
 * pharmacy's trial or subscription has ended.
 */

const base = (pharmacyId) => `/inventory/pharmacies/${pharmacyId}`;
const asArray = (data) => (Array.isArray(data) ? data : []);

// ---- Suppliers ------------------------------------------------------------

/** All suppliers, sorted by name: [{ id, pharmacyId, name, phone, email, address, note, createdAt }]. */
export async function getSuppliers(pharmacyId) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/suppliers`);
  return asArray(data);
}

export async function getSupplier(pharmacyId, supplierId) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/suppliers/${supplierId}`);
  return data;
}

/**
 * @param payload { name, phone, email, address, note }
 *   name is required (max 255); phone max 50; email must be valid (max 255);
 *   address and note max 500. Send null for fields left empty.
 */
export async function createSupplier(pharmacyId, payload) {
  const { data } = await axiosInstance.post(`${base(pharmacyId)}/suppliers`, payload);
  return data;
}

/** Full replace — same payload as createSupplier; fields left out are cleared. */
export async function updateSupplier(pharmacyId, supplierId, payload) {
  const { data } = await axiosInstance.put(`${base(pharmacyId)}/suppliers/${supplierId}`, payload);
  return data;
}

/** Returns { message }. Orders and medicines that pointed at the supplier keep its id. */
export async function deleteSupplier(pharmacyId, supplierId) {
  const { data } = await axiosInstance.delete(`${base(pharmacyId)}/suppliers/${supplierId}`);
  return data;
}

// ---- Purchase orders ------------------------------------------------------

/**
 * All purchase orders, newest first:
 * [{ id, pharmacyId, supplierId, status: DRAFT|RECEIVED, totalCost, createdAt,
 *    receivedAt, items: [{ id, purchaseOrderId, medicineId, quantity, unitCost,
 *    batchNumber, expiryDate }] }]
 */
export async function getPurchaseOrders(pharmacyId) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/purchase-orders`);
  return asArray(data);
}

export async function getPurchaseOrder(pharmacyId, purchaseOrderId) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/purchase-orders/${purchaseOrderId}`);
  return data;
}

/**
 * Create a draft order. Nothing is added to stock until it is received.
 * @param supplierId optional
 * @param items at least one of { medicineId, quantity, unitCost, batchNumber, expiryDate }
 *   medicineId is required; quantity is a whole number above 0; unitCost is
 *   optional and cannot be negative; batchNumber max 100; expiryDate "yyyy-MM-dd".
 */
export async function createPurchaseOrder(pharmacyId, { supplierId, items }) {
  const body = { items };
  if (supplierId) body.supplierId = supplierId;
  const { data } = await axiosInstance.post(`${base(pharmacyId)}/purchase-orders`, body);
  return data;
}

/**
 * Receive a draft order into stock: every line becomes a batch and the medicine
 * quantities go up. Cannot be undone. Fails with 400 when the order was already
 * received and 404 when one of its medicines has been deleted.
 */
export async function receivePurchaseOrder(pharmacyId, purchaseOrderId) {
  const { data } = await axiosInstance.post(`${base(pharmacyId)}/purchase-orders/${purchaseOrderId}/receive`);
  return data;
}

// ---- Stock insights (read-only) -------------------------------------------

/**
 * Counters over the whole catalogue: { totalMedicines, lowStockCount,
 * expiringSoonCount, expiredCount, inStockCount, outOfStockCount,
 * totalStockUnits, totalInventoryValue }. The two expiry counts are batches,
 * not medicines.
 */
export async function getStats(pharmacyId) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/stats`);
  return data;
}

/**
 * Change against about 30 days ago, in percent:
 * { medicinesDeltaPct, inventoryValueDeltaPct }. Either is null until the
 * pharmacy has a month of history.
 */
export async function getStatsTrends(pharmacyId) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/stats/trends`);
  return data;
}

/**
 * Units in and out per calendar month, oldest first, with no gaps:
 * [{ period: "2026-11", unitsIn, unitsOut, net }].
 * @param months 1–24 (the backend defaults to 7)
 */
export async function getMovementsSummary(pharmacyId, months = 7) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/movements/summary`, { params: { months } });
  return asArray(data);
}

/** Medicines at or below their minimum stock level, lowest first (medicine objects). */
export async function getLowStock(pharmacyId) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/low-stock`);
  return asArray(data);
}

/**
 * Batches with stock left that expire within `days` days (1–365):
 * [{ id, medicineId, pharmacyId, batchNumber, expiryDate, quantity, purchasePrice, receivedAt }].
 * Batches carry no medicine name — look it up by medicineId.
 */
export async function getExpiringBatches(pharmacyId, days = 30) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/expiring`, { params: { days } });
  return asArray(data);
}

/** Batches with stock left whose expiry date has passed. Same shape as getExpiringBatches. */
export async function getExpiredBatches(pharmacyId) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/expired`);
  return asArray(data);
}

/**
 * Stock history of one medicine, newest first:
 * [{ id, medicineId, pharmacyId, type: INITIAL|PURCHASE|SALE|ADJUSTMENT|EXPIRED,
 *    quantityChange, resultingQuantity, note, createdBy, createdAt }]
 */
export async function getMedicineMovements(pharmacyId, medicineId) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/medicines/${medicineId}/movements`);
  return asArray(data);
}

/** Every batch of one medicine, earliest expiry first (includes used-up batches). */
export async function getMedicineBatches(pharmacyId, medicineId) {
  const { data } = await axiosInstance.get(`${base(pharmacyId)}/medicines/${medicineId}/batches`);
  return asArray(data);
}
