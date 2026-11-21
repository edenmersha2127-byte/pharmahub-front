import axiosInstance from "@/lib/axios/axiosInstance";

/**
 * Billing API (payment-service, behind the gateway JwtAuth filter).
 * Pharmacy endpoints live under /subscriptions, admin ones under /admin.
 */

// ---- Pharmacy -------------------------------------------------------------

/** Available plans: [{ plan: MONTHLY|YEARLY, price, durationDays, currency }]. */
export async function getPlans() {
  const { data } = await axiosInstance.get("/subscriptions/plans");
  return Array.isArray(data) ? data : [];
}

/**
 * Price a plan with an optional coupon, without charging anything.
 * @returns { valid, message, originalAmount, discountedAmount }
 */
export async function previewCoupon(plan, code) {
  const params = { plan };
  if (code) params.code = code;
  const { data } = await axiosInstance.get("/subscriptions/coupon-preview", { params });
  return data;
}

/**
 * Start a checkout. Returns { subscriptionId, txRef, amount, checkoutUrl, status }.
 * `status` is ACTIVE (and `checkoutUrl` null) when a coupon covers the full
 * price; otherwise PENDING with a Chapa `checkoutUrl` to redirect to.
 */
export async function subscribe({ plan, couponCode }) {
  const body = { plan };
  if (couponCode) body.couponCode = couponCode;
  const { data } = await axiosInstance.post("/subscriptions/subscribe", body);
  return data;
}

/** Confirm a payment with Chapa after returning from checkout. */
export async function verifyPayment(txRef) {
  const { data } = await axiosInstance.post("/subscriptions/verify", null, { params: { txRef } });
  return data;
}

/** Current subscription, or null when the pharmacy has never had one. */
export async function getMySubscription() {
  try {
    const { data } = await axiosInstance.get("/subscriptions/me");
    return data;
  } catch (e) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

/** Payment history: { payments, page, size, totalElements, totalPages }. */
export async function getMyPayments({ page = 0, size = 20 } = {}) {
  const { data } = await axiosInstance.get("/subscriptions/payments", { params: { page, size } });
  return data;
}

// ---- Admin ----------------------------------------------------------------

export async function getAllSubscriptions({ page = 0, size = 20 } = {}) {
  const { data } = await axiosInstance.get("/admin/subscriptions", { params: { page, size } });
  return data;
}

export async function getAllPayments({ page = 0, size = 20 } = {}) {
  const { data } = await axiosInstance.get("/admin/payments", { params: { page, size } });
  return data;
}

export async function getCoupons() {
  const { data } = await axiosInstance.get("/admin/coupons");
  return Array.isArray(data) ? data : [];
}

/**
 * @param discountType PERCENTAGE | FIXED
 * @param maxRedemptions null = unlimited
 * @param expiresAt ISO local datetime ("2026-12-31T23:59:59") or null = never
 */
export async function createCoupon({ code, discountType, discountValue, maxRedemptions, expiresAt }) {
  const body = { code, discountType, discountValue };
  if (maxRedemptions != null) body.maxRedemptions = maxRedemptions;
  if (expiresAt) body.expiresAt = expiresAt;
  const { data } = await axiosInstance.post("/admin/coupons", body);
  return data;
}
