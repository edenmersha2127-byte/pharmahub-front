/** Roles as emitted by the backend JWT `role` claim. */
export const ROLES = {
  CUSTOMER: "CUSTOMER",
  PHARMACY: "PHARMACY",
  ADMIN: "ADMIN",
  /** Sub-admin who can only moderate reports and support tickets. */
  REPORT_ADMIN: "REPORT_ADMIN",
};

/** Roles allowed into the admin area (the shell, not every page inside it). */
export const ADMIN_AREA_ROLES = [ROLES.ADMIN, ROLES.REPORT_ADMIN];


export function roleHome(role) {
  switch (role) {
    case ROLES.ADMIN:
      return "/admin";
    case ROLES.REPORT_ADMIN:
      return "/admin/reports";
    case ROLES.PHARMACY:
      return "/pharmacy";
    case ROLES.CUSTOMER:
    default:
      return "/dashboard";
  }
}
