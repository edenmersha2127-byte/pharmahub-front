/** Must match the backend BillingCycle / SubscriptionStatus / PaymentStatus enums. */

export const PLAN_META = {
  MONTHLY: { label: "Monthly", per: "month", blurb: "Pay as you go. Cancel any time." },
  YEARLY: { label: "Yearly", per: "year", blurb: "One payment for a full year of access." },
};

export function planMeta(plan) {
  return PLAN_META[plan] ?? { label: plan ?? "—", per: "period", blurb: "" };
}

const SUBSCRIPTION_STATUS = {
  TRIAL: { label: "Free trial", badge: "bg-indigo-500/10 text-indigo-600", dot: "bg-indigo-500" },
  PENDING: { label: "Payment pending", badge: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" },
  ACTIVE: { label: "Active", badge: "bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-500" },
  EXPIRED: { label: "Expired", badge: "bg-rose-500/10 text-rose-600", dot: "bg-rose-500" },
  CANCELLED: { label: "Cancelled", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" },
};

export function subscriptionStatusTone(status) {
  return SUBSCRIPTION_STATUS[status] ?? { label: status ?? "None", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" };
}

const PAYMENT_STATUS = {
  PENDING: { label: "Pending", badge: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" },
  SUCCESS: { label: "Paid", badge: "bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-500" },
  FAILED: { label: "Failed", badge: "bg-rose-500/10 text-rose-600", dot: "bg-rose-500" },
};

export function paymentStatusTone(status) {
  return PAYMENT_STATUS[status] ?? { label: status ?? "—", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" };
}

/** Whole days from now until `iso` (negative when already past), or null. */
export function daysUntil(iso) {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

/** localStorage key holding the txRef of a checkout the pharmacy was sent to. */
export const PENDING_TX_KEY = "ml.pendingTxRef";
