/**
 * Backend error codes → friendly message (+ optional form field to flag).
 * This is the most reliable mapping — ask the backend to return a stable `code`
 * (e.g. body { code: "DUPLICATE_LICENSE", message: "..." }). Until it does, the
 * heuristics in parseApiError() below cover the common cases.
 */
const ERROR_CODES = {
  INVALID_CREDENTIALS: { message: "Incorrect email or password.", field: "password" },
  EMAIL_NOT_VERIFIED: { message: "Please verify your email before signing in." },
  PHARMACY_NOT_APPROVED: { message: "Your pharmacy is awaiting admin approval." },
  ACCOUNT_LOCKED: { message: "This account is locked. Please contact support." },
  DUPLICATE_LICENSE: { message: "This license number is already registered.", field: "licenseNumber" },
  EMAIL_ALREADY_EXISTS: { message: "This email is already registered.", field: "email" },
  INVALID_TOKEN: { message: "This link is invalid or has expired." },
};

/**
 * Maps an Axios error to { message, field? } with friendly, user-facing text.
 * Priority: backend `code` → status + message heuristics → clean backend
 * message → fallback. Never surfaces raw SQL / stack traces.
 */
export function parseApiError(error, fallback = "Something went wrong. Please try again.") {
  if (!error?.response) {
    return { message: "Cannot reach the server. Check your connection and try again." };
  }

  const { status, data } = error.response;

  // 1) Explicit backend code (best, locale-friendly).
  const code = data?.code;
  if (code && ERROR_CODES[code]) return { ...ERROR_CODES[code] };

  const raw = typeof data === "string" ? data : data?.message || data?.error || "";
  const text = raw.toLowerCase();

  // 2) Conflict / duplicate (e.g. unique constraint).
  if (
    status === 409 ||
    text.includes("duplicate") ||
    text.includes("already exists") ||
    text.includes("already registered")
  ) {
    if (text.includes("license")) return { message: "This license number is already registered.", field: "licenseNumber" };
    if (text.includes("email")) return { message: "This email is already registered.", field: "email" };
    // A 409 with a clean, human-written reason (e.g. "You have already reported
    // this pharmacy recently…") is more useful than the generic line.
    if (status === 409 && raw && raw.length < 200 && !/duplicate|constraint|exception|sql/.test(text)) {
      return { message: raw };
    }
    return { message: "That record already exists." };
  }

  // 3) Subscription paywall (inventory/suppliers/purchases return 402).
  if (status === 402) {
    return {
      message: raw || "Your free trial or subscription has ended. Please subscribe to continue.",
      subscriptionRequired: true,
    };
  }

  // 4) Auth-flavoured statuses.
  if (status === 401) return { message: "Incorrect email or password.", field: "password" };
  if (status === 403) {
    if (text.includes("approve") || text.includes("pending")) return { message: "Your pharmacy is awaiting admin approval." };
    if (text.includes("verif")) return { message: "Please verify your email before signing in." };
    return { message: "You don't have permission to do that." };
  }
  if (status === 429) return { message: "Too many attempts. Please wait a moment and try again." };
  if (status >= 500) return { message: "Something went wrong on our side. Please try again shortly." };

  // 5) Bean-validation: { fieldErrors: { field: msg } }, { errors: { field: msg } }
  //    or [{ field, message }].
  if (data?.fieldErrors && typeof data.fieldErrors === "object") {
    const [field, msg] = Object.entries(data.fieldErrors)[0] ?? [];
    if (msg) return { message: `${field}: ${msg}`, field };
  }
  if (data?.errors) {
    if (Array.isArray(data.errors) && data.errors[0]) {
      const f = data.errors[0];
      return { message: f.message || String(f), field: f.field };
    }
    if (typeof data.errors === "object") {
      const [field, msg] = Object.entries(data.errors)[0] ?? [];
      if (msg) return { message: String(msg), field };
    }
  }

  // 6) Clean backend message (but never dump SQL / stack traces).
  if (raw && raw.length < 160 && !text.includes("exception") && !text.includes("sql")) {
    return { message: raw };
  }
  return { message: fallback };
}

/** Back-compat: returns only the friendly message string. */
export function extractApiError(error, fallback) {
  return parseApiError(error, fallback).message;
}

/** Formats a distance in metres as "450 m" or "1.2 km". */
export function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Formats an ISO date/datetime as "Jun 20, 2026", or "—" if absent/invalid. */
export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Formats an ISO datetime as "Jun 20, 2026, 3:45 PM", or "—" if absent/invalid. */
export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Formats an amount as "ETB 1,000.00", or "—" if absent. */
export function formatMoney(amount, currency = "ETB") {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  const value = Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency || "ETB"} ${value}`;
}

/** Short, human-friendly form of a UUID: "3f2a9c1b". */
export function shortId(id) {
  return id ? String(id).slice(0, 8) : "—";
}

/** Relative time like "2h ago" from an ISO date, or "" if absent/invalid. */
export function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

/** Google Maps directions deep-link to a destination (optionally from an origin). */
export function googleMapsDirectionsUrl(destLat, destLng, originLat, originLng) {
  const base = "https://www.google.com/maps/dir/?api=1";
  const dest = `&destination=${destLat},${destLng}`;
  const origin =
    originLat != null && originLng != null ? `&origin=${originLat},${originLng}` : "";
  return `${base}${origin}${dest}`;
}
