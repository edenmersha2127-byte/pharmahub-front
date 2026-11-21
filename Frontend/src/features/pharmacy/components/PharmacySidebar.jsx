import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  LayoutDashboardIcon,
  BoxesIcon,
  PlusIcon,
  ClipboardListIcon,
  ShoppingCartIcon,
  BarChart3Icon,
  UserIcon,
  SettingsIcon,
  PillIcon,
  CrownIcon,
  LogOutIcon,
  CreditCardIcon,
  FlagIcon,
  LifeBuoyIcon,
  TruckIcon,
  ReceiptIcon,
  UsersIcon,
  UserCogIcon,
  BookmarkIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDisplayName } from "@/features/auth/hooks/useDisplayName";
import { PATHS } from "@/router/routes";
import { cn } from "@/lib/utils";

// An item is active when the pathname equals its `to`, except the two inventory
// entries, which share a pathname and are told apart by their `id`.
const SECTIONS = [
  {
    items: [{ id: "dashboard", to: PATHS.PHARMACY_HOME, label: "Dashboard", icon: LayoutDashboardIcon }],
  },
  {
    title: "Inventory",
    items: [
      { id: "all", to: PATHS.PHARMACY_INVENTORY, label: "All Medicines", icon: BoxesIcon },
      { id: "add", to: `${PATHS.PHARMACY_INVENTORY}?add=1`, label: "Add Medicine", icon: PlusIcon },
      { id: "suppliers", to: PATHS.PHARMACY_SUPPLIERS, label: "Suppliers", icon: TruckIcon },
      { id: "purchases", to: PATHS.PHARMACY_PURCHASES, label: "Purchase Orders", icon: ClipboardListIcon },
      { id: "insights", to: PATHS.PHARMACY_INSIGHTS, label: "Stock Insights", icon: BarChart3Icon },
    ],
  },
  {
    title: "Sales",
    items: [
      { id: "pos", to: PATHS.PHARMACY_POS, label: "Point of Sale", icon: ShoppingCartIcon },
      { id: "sales", to: PATHS.PHARMACY_SALES, label: "Sales", icon: ReceiptIcon },
      { id: "customers", to: PATHS.PHARMACY_CUSTOMERS, label: "Customers", icon: UsersIcon },
    ],
  },
  {
    title: "Business",
    items: [
      { id: "staff", to: PATHS.PHARMACY_STAFF, label: "Staff", icon: UserCogIcon },
      { id: "reports", to: PATHS.PHARMACY_REPORTS, label: "Customer Reports", icon: FlagIcon },
      { id: "subscription", to: PATHS.PHARMACY_SUBSCRIPTION, label: "Subscription", icon: CreditCardIcon },
      { id: "support", to: PATHS.PHARMACY_SUPPORT, label: "Help & Support", icon: LifeBuoyIcon },
    ],
  },
];

const PATH_TO_ID = Object.fromEntries(
  SECTIONS.flatMap((s) => s.items)
    .filter((i) => i.id !== "all" && i.id !== "add")
    .map((i) => [i.to, i.id])
);

const itemClass = (active) =>
  cn(
    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
    active
      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

const SOON = [
  { label: "Reservations", icon: BookmarkIcon },
  { label: "Profile", icon: UserIcon },
  { label: "Settings", icon: SettingsIcon },
];

function initials(value) {
  if (!value) return "U";
  const base = value.includes("@") ? value.split("@")[0] : value.trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

/** Fixed left sidebar for the pharmacy area (desktop). */
export default function PharmacySidebar() {
  const { user, logout } = useAuth();
  const displayName = useDisplayName();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  // "Add Medicine" and "All Medicines" share a pathname and differ only by the
  // `?add` query, so derive the active item explicitly instead of via NavLink.
  const onInventory = pathname === PATHS.PHARMACY_INVENTORY;
  const isAdd = searchParams.get("add") != null;
  const activeId = onInventory ? (isAdd ? "add" : "all") : PATH_TO_ID[pathname] ?? null;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-foreground/5 bg-background/80 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
          <PillIcon className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="font-heading text-base font-bold tracking-tight">PharmaHub</p>
          <p className="text-[11px] text-muted-foreground">Pharmacy Dashboard</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {SECTIONS.map((section, index) => (
          <div key={section.title ?? index} className="flex flex-col gap-1">
            {section.title && (
              <p className="px-3.5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </p>
            )}
            {section.items.map(({ id, to, label, icon: Icon }) => (
              <Link key={id} to={to} className={itemClass(activeId === id)}>
                <Icon className="size-[18px]" />
                {label}
              </Link>
            ))}
          </div>
        ))}

        <p className="px-3.5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Coming soon
        </p>
        {SOON.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground/50"
          >
            <Icon className="size-[18px]" />
            {label}
            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Soon
            </span>
          </span>
        ))}
      </nav>

      <div className="m-3 rounded-2xl border border-foreground/5 bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
        <CrownIcon className="size-6" />
        <p className="mt-2 text-sm font-semibold">Your subscription</p>
        <p className="mt-0.5 text-xs text-white/80">Plans, payments &amp; coupon codes.</p>
        <Link
          to={PATHS.PHARMACY_SUBSCRIPTION}
          className="mt-3 block w-full rounded-xl bg-white px-3 py-2 text-center text-sm font-semibold text-indigo-700 transition-transform hover:-translate-y-0.5"
        >
          Manage plan
        </Link>
      </div>

      <div className="border-t border-foreground/5 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-1 py-1.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-semibold text-white">
            {initials(displayName || user?.email)}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName || user?.email?.split("@")[0] || "Account"}
            </p>
            <p className="text-[11px] text-muted-foreground">Pharmacist</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-foreground/10 bg-background px-3.5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-600"
        >
          <LogOutIcon className="size-[18px]" />
          Log out
        </button>
      </div>
    </aside>
  );
}
