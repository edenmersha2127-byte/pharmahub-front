import {
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  PackageXIcon,
  PackageCheckIcon,
  FileCheckIcon,
  FileWarningIcon,
  SparklesIcon,
  Building2Icon,
  BellIcon,
  FlagIcon,
  MessageSquareIcon,
  BanIcon,
  CrownIcon,
  CreditCardIcon,
  CalendarClockIcon,
  ShoppingCartIcon,
} from "lucide-react";

/** Maps a NotificationType to an icon + colour tone for the bell dropdown. */
const META = {
  // Pharmacy admin
  REGISTRATION_RECEIVED: { icon: ClockIcon, tone: "bg-amber-500/10 text-amber-600" },
  PHARMACY_APPROVED: { icon: CheckCircle2Icon, tone: "bg-emerald-500/10 text-emerald-600" },
  PHARMACY_REJECTED: { icon: XCircleIcon, tone: "bg-rose-500/10 text-rose-600" },
  LOW_STOCK: { icon: AlertTriangleIcon, tone: "bg-amber-500/10 text-amber-600" },
  OUT_OF_STOCK: { icon: PackageXIcon, tone: "bg-rose-500/10 text-rose-600" },
  MEDICINE_UPDATE_REMINDER: { icon: BellIcon, tone: "bg-indigo-500/10 text-indigo-600" },
  // Customer
  ACCOUNT_WELCOME: { icon: SparklesIcon, tone: "bg-indigo-500/10 text-indigo-600" },
  PRESCRIPTION_PROCESSED: { icon: FileCheckIcon, tone: "bg-emerald-500/10 text-emerald-600" },
  PRESCRIPTION_NEEDS_REVIEW: { icon: FileWarningIcon, tone: "bg-amber-500/10 text-amber-600" },
  MEDICINE_BACK_IN_STOCK: { icon: PackageCheckIcon, tone: "bg-emerald-500/10 text-emerald-600" },
  // System admin
  NEW_PHARMACY_PENDING: { icon: Building2Icon, tone: "bg-indigo-500/10 text-indigo-600" },
  NEW_REPORT_FLAGGED: { icon: AlertTriangleIcon, tone: "bg-rose-500/10 text-rose-600" },
  // Inventory / sales
  MEDICINE_EXPIRING: { icon: CalendarClockIcon, tone: "bg-amber-500/10 text-amber-600" },
  PURCHASE_RECEIVED: { icon: PackageCheckIcon, tone: "bg-emerald-500/10 text-emerald-600" },
  SALE_COMPLETED: { icon: ShoppingCartIcon, tone: "bg-emerald-500/10 text-emerald-600" },
  // Reports / moderation
  COMPLAINT_RECEIVED: { icon: FlagIcon, tone: "bg-rose-500/10 text-rose-600" },
  NEW_REPORT_SUBMITTED: { icon: FlagIcon, tone: "bg-amber-500/10 text-amber-600" },
  PHARMACY_RESPONDED: { icon: MessageSquareIcon, tone: "bg-indigo-500/10 text-indigo-600" },
  PHARMACY_WARNED: { icon: AlertTriangleIcon, tone: "bg-amber-500/10 text-amber-600" },
  PHARMACY_SUSPENDED: { icon: BanIcon, tone: "bg-rose-500/10 text-rose-600" },
  COMPLAINT_RESOLVED: { icon: CheckCircle2Icon, tone: "bg-emerald-500/10 text-emerald-600" },
  // Subscription / billing
  TRIAL_STARTED: { icon: SparklesIcon, tone: "bg-indigo-500/10 text-indigo-600" },
  SUBSCRIPTION_ACTIVATED: { icon: CrownIcon, tone: "bg-emerald-500/10 text-emerald-600" },
  SUBSCRIPTION_EXPIRING_SOON: { icon: ClockIcon, tone: "bg-amber-500/10 text-amber-600" },
  SUBSCRIPTION_EXPIRED: { icon: CreditCardIcon, tone: "bg-rose-500/10 text-rose-600" },
  PAYMENT_FAILED: { icon: XCircleIcon, tone: "bg-rose-500/10 text-rose-600" },
  // Fallback
  GENERAL: { icon: BellIcon, tone: "bg-muted text-muted-foreground" },
};

export function notificationMeta(type) {
  return META[type] ?? META.GENERAL;
}
