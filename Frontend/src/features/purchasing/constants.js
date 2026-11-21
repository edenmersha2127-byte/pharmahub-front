import { shortId } from "@/lib/helpers/helpers";

/** Must match the inventory-service PurchaseOrderStatus / StockMovementType enums. */

const neutral = { badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" };

const ORDER_STATUS = {
  DRAFT: { label: "Not received", badge: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" },
  RECEIVED: { label: "Received", badge: "bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-500" },
};

export function orderStatusTone(status) {
  return ORDER_STATUS[status] ?? { label: status ?? "—", ...neutral };
}

const MOVEMENT_TYPE = {
  INITIAL: { label: "Opening stock", badge: "bg-indigo-500/10 text-indigo-600" },
  PURCHASE: { label: "Purchase", badge: "bg-emerald-500/10 text-emerald-600" },
  SALE: { label: "Sale", badge: "bg-sky-500/10 text-sky-600" },
  ADJUSTMENT: { label: "Adjustment", badge: "bg-amber-500/10 text-amber-600" },
  EXPIRED: { label: "Expired", badge: "bg-rose-500/10 text-rose-600" },
};

export function movementTypeTone(type) {
  return MOVEMENT_TYPE[type] ?? { label: type ?? "—", badge: neutral.badge };
}

/** Field limits from SupplierRequest and PurchaseOrderItemRequest. */
export const LIMITS = {
  supplierName: 255,
  supplierPhone: 50,
  supplierEmail: 255,
  supplierAddress: 500,
  supplierNote: 500,
  batchNumber: 100,
  quantity: 2_147_483_647, // Java int
};

/** Look-ahead choices for the "expiring soon" list (the backend accepts 1–365). */
export const EXPIRY_WINDOWS = [30, 60, 90, 180, 365];

/** Month ranges for the stock movement chart (the backend accepts 1–24). */
export const MOVEMENT_RANGES = [3, 6, 12, 24];

/** Total units across the lines of a purchase order. */
export function orderUnits(order) {
  return (order?.items ?? []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
}

/**
 * Whole days from today until a "yyyy-MM-dd" date (negative when past), or
 * null. Compares calendar days, so the time of day does not matter.
 */
export function daysUntilDate(isoDate) {
  if (!isoDate) return null;
  const [y, m, d] = String(isoDate).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86_400_000);
}

/** "In 12 days", "Today", "3 days ago". */
export function daysLabel(days) {
  if (days == null) return "—";
  if (days === 0) return "Today";
  const n = Math.abs(days);
  const unit = n === 1 ? "day" : "days";
  return days > 0 ? `In ${n} ${unit}` : `${n} ${unit} ago`;
}

/** "2026-11" → "Nov 2026". */
export function monthLabel(period) {
  const [y, m] = String(period ?? "").split("-").map(Number);
  if (!y || !m) return period ?? "—";
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** "2026-11" → "Nov". */
export function monthShort(period) {
  const [y, m] = String(period ?? "").split("-").map(Number);
  if (!y || !m) return period ?? "—";
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

/** Display name for a medicine that may no longer be in the inventory. */
export function medicineLabel(medicine, id) {
  return medicine?.medicineName ?? `Medicine ${shortId(id)}`;
}

/** 1234567 → "1,234,567". */
export function formatCount(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString();
}
