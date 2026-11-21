import { parseApiError } from "@/lib/helpers/helpers";

/** Must match the backend PaymentMethod enum (sales-service). */
export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
];

const PAYMENT_TONES = {
  CASH: { label: "Cash", badge: "bg-emerald-500/10 text-emerald-600" },
  CARD: { label: "Card", badge: "bg-indigo-500/10 text-indigo-600" },
  MOBILE_MONEY: { label: "Mobile money", badge: "bg-amber-500/10 text-amber-600" },
};

export function paymentTone(method) {
  return PAYMENT_TONES[method] ?? { label: method ?? "—", badge: "bg-muted text-muted-foreground" };
}

export function paymentLabel(method) {
  return paymentTone(method).label;
}

/** Must match the backend Granularity enum (sales-service). */
export const GRANULARITIES = [
  { value: "DAY", label: "By day" },
  { value: "MONTH", label: "By month" },
];

/** Backend limits from PharmacyCustomerRequest. */
export const CUSTOMER_LIMITS = { name: 255, phone: 50, email: 255, note: 500 };

/** Rows per page for lists the backend returns in one piece. */
export const PAGE_SIZE = 20;

/** Local calendar date as "YYYY-MM-DD" (what the analytics endpoints expect). */
export function toISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** First day of the current month — the backend's default range start. */
export function monthStartISO() {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
}

/**
 * Label for a timeseries bucket: "2026-11-05" → "Nov 5", "2026-11" → "Nov 2026".
 * Parsed by hand so the date never shifts with the browser's timezone.
 */
export function formatPeriod(period) {
  const [y, m, d] = String(period ?? "").split("-").map(Number);
  if (!y || !m) return period ?? "—";
  if (!d) return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Slice one page out of a full list, in the shape usePagedList understands. */
export function pageOf(rows, page, size = PAGE_SIZE) {
  return {
    content: rows.slice(page * size, page * size + size),
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / size),
  };
}

const INVENTORY_PREFIX = "Checkout rejected by inventory:";

/**
 * Turns a failed checkout into { message, subscriptionRequired? }.
 *
 * When inventory refuses the cart (not enough stock, medicine gone, no
 * subscription) the sales-service answers 409 with the message
 * "Checkout rejected by inventory: <inventory's JSON error body>", so the real
 * reason has to be dug out of that embedded JSON.
 */
export function parseCheckoutError(error, fallback = "Could not complete the sale. Please try again.") {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const raw = typeof data?.message === "string" ? data.message : "";

  if (status === 409 && raw.startsWith(INVENTORY_PREFIX)) {
    const body = raw.slice(INVENTORY_PREFIX.length).trim();
    let inner = null;
    try {
      inner = JSON.parse(body);
    } catch {
      /* not JSON — fall through to the plain text */
    }
    const innerMessage = typeof inner?.message === "string" ? inner.message : "";

    if (inner?.status === 402) {
      return {
        message: innerMessage || "Your free trial or subscription has ended. Please subscribe to continue.",
        subscriptionRequired: true,
      };
    }
    if (inner?.status === 403) return { message: "You don't have permission to sell medicines." };
    if (inner?.status === 404) {
      return { message: "A medicine in the cart is no longer in your inventory. Remove it and try again." };
    }
    if (innerMessage) return { message: innerMessage };
    if (body && !body.startsWith("{") && body.length < 200) return { message: body };
    return { message: fallback };
  }

  // 502: inventory is down or unreachable — the backend's message says so.
  if (status === 502 && raw) return { message: raw };

  return parseApiError(error, fallback);
}
