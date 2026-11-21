/**
 * Central route path constants.
 *
 * Several of these are also hard-coded in the backend as notification links
 * (/my-reports, /pharmacy/reports, /pharmacy/subscription, /admin/reports,
 * /pharmacy/inventory, /admin/pharmacies) and as the Chapa return URL
 * (/pharmacy/subscription) — change them on both sides or not at all.
 */
export const PATHS = {
  ROOT: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",

  CUSTOMER_HOME: "/dashboard",
  CUSTOMER_SEARCH: "/search",
  CUSTOMER_PRESCRIPTIONS: "/prescriptions",
  CUSTOMER_PROFILE: "/profile",
  CUSTOMER_REPORTS: "/my-reports",
  CUSTOMER_SUPPORT: "/support",

  PHARMACY_HOME: "/pharmacy",
  PHARMACY_INVENTORY: "/pharmacy/inventory",
  PHARMACY_SUBSCRIPTION: "/pharmacy/subscription",
  PHARMACY_REPORTS: "/pharmacy/reports",
  PHARMACY_SUPPORT: "/pharmacy/support",
  PHARMACY_SUPPLIERS: "/pharmacy/suppliers",
  PHARMACY_PURCHASES: "/pharmacy/purchases",
  PHARMACY_INSIGHTS: "/pharmacy/insights",
  PHARMACY_POS: "/pharmacy/pos",
  PHARMACY_SALES: "/pharmacy/sales",
  PHARMACY_CUSTOMERS: "/pharmacy/customers",
  PHARMACY_STAFF: "/pharmacy/staff",

  ADMIN_HOME: "/admin",
  ADMIN_PHARMACIES: "/admin/pharmacies",
  ADMIN_USERS: "/admin/users",
  ADMIN_HOSPITALS: "/admin/hospitals",
  ADMIN_BILLING: "/admin/billing",
  ADMIN_REPORTS: "/admin/reports",
  ADMIN_SUPPORT: "/admin/support",
  ADMIN_ACTIVITY: "/admin/activity",
};
