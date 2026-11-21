import {
  SearchXIcon,
  UploadCloudIcon,
  CreditCardIcon,
  KeyRoundIcon,
  BugIcon,
  LightbulbIcon,
  MessageSquareIcon,
} from "lucide-react";

/** Support ticket categories — must match the backend IssueCategory enum. */
export const ISSUE_CATEGORIES = [
  { value: "SEARCH_NOT_WORKING", label: "Search not working", icon: SearchXIcon, tone: "bg-amber-500/10 text-amber-600" },
  { value: "UPLOAD_FAILED", label: "Upload failed", icon: UploadCloudIcon, tone: "bg-rose-500/10 text-rose-600" },
  { value: "PAYMENT_ISSUE", label: "Payment issue", icon: CreditCardIcon, tone: "bg-violet-500/10 text-violet-600" },
  { value: "LOGIN_PROBLEM", label: "Login problem", icon: KeyRoundIcon, tone: "bg-orange-500/10 text-orange-600" },
  { value: "BUG", label: "Something is broken", icon: BugIcon, tone: "bg-rose-500/10 text-rose-600" },
  { value: "FEATURE_REQUEST", label: "Feature request", icon: LightbulbIcon, tone: "bg-emerald-500/10 text-emerald-600" },
  { value: "OTHER", label: "Something else", icon: MessageSquareIcon, tone: "bg-slate-500/10 text-slate-600" },
];

const MAP = Object.fromEntries(ISSUE_CATEGORIES.map((c) => [c.value, c]));

export function issueCategoryMeta(value) {
  return MAP[value] ?? ISSUE_CATEGORIES[ISSUE_CATEGORIES.length - 1];
}
