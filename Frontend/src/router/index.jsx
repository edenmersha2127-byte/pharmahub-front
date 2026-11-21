import { createBrowserRouter, Navigate } from "react-router-dom";
import { PATHS } from "@/router/routes";
import { ROLES, ADMIN_AREA_ROLES } from "@/lib/auth/roles";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import { RootRedirect, PublicOnlyRoute, RequireRole } from "@/router/guards";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import CustomerLayout from "@/features/customer/components/CustomerLayout";
import CustomerDashboardPage from "@/features/customer/pages/CustomerDashboardPage";
import MedicineSearchPage from "@/features/customer/pages/MedicineSearchPage";
import PrescriptionsUploadPage from "@/features/customer/pages/PrescriptionsUploadPage";
import MyProfilePage from "@/features/customer/pages/MyProfilePage";
import PharmacyLayout from "@/features/pharmacy/components/PharmacyLayout";
import PharmacyDashboardPage from "@/features/pharmacy/pages/PharmacyDashboardPage";
import InventoryPage from "@/features/pharmacy/pages/InventoryPage";
import AdminLayout from "@/features/admin/components/AdminLayout";
import AdminDashboardPage from "@/features/admin/pages/AdminDashboardPage";
import ManagePharmacyPage from "@/features/admin/pages/ManagePharmacyPage";
import ManageUserPage from "@/features/admin/pages/ManageUserPage";
import ManageHospitalPage from "@/features/admin/pages/ManageHospitalPage";
import SubscriptionPage from "@/features/billing/pages/SubscriptionPage";
import AdminBillingPage from "@/features/billing/pages/AdminBillingPage";
import MyReportsPage from "@/features/reports/pages/MyReportsPage";
import PharmacyReportsPage from "@/features/reports/pages/PharmacyReportsPage";
import AdminReportsPage from "@/features/reports/pages/AdminReportsPage";
import AdminAuditLogPage from "@/features/reports/pages/AdminAuditLogPage";
import SupportPage from "@/features/support/pages/SupportPage";
import AdminSupportPage from "@/features/support/pages/AdminSupportPage";
import StaffPage from "@/features/staff/pages/StaffPage";
import SuppliersPage from "@/features/purchasing/pages/SuppliersPage";
import PurchaseOrdersPage from "@/features/purchasing/pages/PurchaseOrdersPage";
import StockInsightsPage from "@/features/purchasing/pages/StockInsightsPage";
import PosPage from "@/features/sales/pages/PosPage";
import SalesPage from "@/features/sales/pages/SalesPage";
import PharmacyCustomersPage from "@/features/sales/pages/PharmacyCustomersPage";

/** Pages inside the admin shell that moderators (REPORT_ADMIN) may not open. */
const superAdminOnly = (page) => <RequireRole roles={[ROLES.ADMIN]}>{page}</RequireRole>;

export const router = createBrowserRouter([
  { path: PATHS.ROOT, element: <RootRedirect /> },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: PATHS.LOGIN, element: <LoginPage /> },
      { path: PATHS.REGISTER, element: <RegisterPage /> },
      { path: PATHS.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
      { path: PATHS.RESET_PASSWORD, element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} />,
    children: [
      {
        element: <CustomerLayout />,
        children: [
          { path: PATHS.CUSTOMER_HOME, element: <CustomerDashboardPage /> },
          { path: PATHS.CUSTOMER_SEARCH, element: <MedicineSearchPage /> },
          { path: PATHS.CUSTOMER_PRESCRIPTIONS, element: <PrescriptionsUploadPage /> },
          { path: PATHS.CUSTOMER_PROFILE, element: <MyProfilePage /> },
          { path: PATHS.CUSTOMER_REPORTS, element: <MyReportsPage /> },
          { path: PATHS.CUSTOMER_SUPPORT, element: <SupportPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={[ROLES.PHARMACY]} />,
    children: [
      {
        element: <PharmacyLayout />,
        children: [
          { path: PATHS.PHARMACY_HOME, element: <PharmacyDashboardPage /> },
          { path: PATHS.PHARMACY_INVENTORY, element: <InventoryPage /> },
          { path: PATHS.PHARMACY_SUBSCRIPTION, element: <SubscriptionPage /> },
          { path: PATHS.PHARMACY_REPORTS, element: <PharmacyReportsPage /> },
          { path: PATHS.PHARMACY_SUPPORT, element: <SupportPage /> },
          { path: PATHS.PHARMACY_STAFF, element: <StaffPage /> },
          { path: PATHS.PHARMACY_SUPPLIERS, element: <SuppliersPage /> },
          { path: PATHS.PHARMACY_PURCHASES, element: <PurchaseOrdersPage /> },
          { path: PATHS.PHARMACY_INSIGHTS, element: <StockInsightsPage /> },
          { path: PATHS.PHARMACY_POS, element: <PosPage /> },
          { path: PATHS.PHARMACY_SALES, element: <SalesPage /> },
          { path: PATHS.PHARMACY_CUSTOMERS, element: <PharmacyCustomersPage /> },
          // Backend notifications link to /pharmacy/dashboard.
          { path: "/pharmacy/dashboard", element: <Navigate to={PATHS.PHARMACY_HOME} replace /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={ADMIN_AREA_ROLES} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: PATHS.ADMIN_HOME, element: superAdminOnly(<AdminDashboardPage />) },
          { path: PATHS.ADMIN_PHARMACIES, element: superAdminOnly(<ManagePharmacyPage />) },
          { path: PATHS.ADMIN_USERS, element: superAdminOnly(<ManageUserPage />) },
          { path: PATHS.ADMIN_HOSPITALS, element: superAdminOnly(<ManageHospitalPage />) },
          { path: PATHS.ADMIN_BILLING, element: superAdminOnly(<AdminBillingPage />) },
          { path: PATHS.ADMIN_ACTIVITY, element: superAdminOnly(<AdminAuditLogPage />) },
          { path: PATHS.ADMIN_REPORTS, element: <AdminReportsPage /> },
          { path: PATHS.ADMIN_SUPPORT, element: <AdminSupportPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to={PATHS.ROOT} replace /> },
]);

export default router;
