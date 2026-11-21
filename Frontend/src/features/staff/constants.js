/** Field limits, matching the backend request validation and column sizes. */
export const STAFF_LIMITS = {
  EMAIL_MAX: 255,
  FULL_NAME_MAX: 200,
  JOB_TITLE_MAX: 100,
  PASSWORD_MIN: 8,
};

/**
 * Everyday wording for each backend Permission value. The list an owner can
 * pick from comes from GET /pharmacy/staff/permissions; this only supplies the
 * text. Unknown values fall back to a readable version of the name.
 */
const PERMISSION_META = {
  SELL_MEDICINE: {
    label: "Sell medicines",
    description: "Ring up sales at the counter. Stock goes down with each sale.",
  },
  PRINT_RECEIPT: {
    label: "Open receipts",
    description: "Open a past sale and print its receipt again.",
  },
  MANAGE_MEDICINES: {
    label: "Edit medicines",
    description: "Add, change and remove medicines.",
  },
  RECEIVE_STOCK: {
    label: "Receive stock",
    description: "Mark a purchase order as received so the stock is added.",
  },
  MANAGE_SUPPLIERS: {
    label: "Manage suppliers",
    description: "See, add, change and remove suppliers.",
  },
  MANAGE_PURCHASES: {
    label: "Manage purchase orders",
    description: "See purchase orders and create new ones.",
  },
  VIEW_INVENTORY: {
    label: "View inventory",
    description: "See medicines, stock levels and expiry dates. Needed to look up a medicine when selling.",
  },
  VIEW_REPORTS: {
    label: "View sales reports",
    description: "See the sales history, daily totals and charts.",
  },
  MANAGE_CUSTOMERS: {
    label: "Manage customers",
    description: "See, add, change and remove the pharmacy's own customers.",
  },
  MANAGE_STAFF: {
    label: "Manage staff",
    description: "Not in use yet. For now only the owner can manage staff.",
  },
};

function readable(value) {
  const text = String(value ?? "").replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** { label, description } for a permission name. */
export function permissionMeta(permission) {
  return PERMISSION_META[permission] ?? { label: readable(permission), description: "" };
}

const TONES = {
  active: { label: "Active", badge: "bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-500" },
  inactive: { label: "Deactivated", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" },
};

/** Badge tone for a staff member's `active` flag. */
export function staffStatusTone(active) {
  return active ? TONES.active : TONES.inactive;
}
