import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CrownIcon,
  CheckIcon,
  TicketPercentIcon,
  Loader2Icon,
  ReceiptIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as billingApi from "@/features/billing/api/billingApi";
import {
  planMeta,
  subscriptionStatusTone,
  paymentStatusTone,
  daysUntil,
  PENDING_TX_KEY,
} from "@/features/billing/constants";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader, ErrorBanner, Badge } from "@/components/common/PageBits";
import Pagination from "@/components/common/Pagination";
import { primaryBtn, ghostBtn, fieldClass, cardClass } from "@/components/common/styles";
import EmptyState from "@/features/customer/components/EmptyState";
import { extractApiError, formatDate, formatDateTime, formatMoney } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

function readPendingTx() {
  try {
    return localStorage.getItem(PENDING_TX_KEY);
  } catch {
    return null;
  }
}

function clearPendingTx() {
  try {
    localStorage.removeItem(PENDING_TX_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/** Summary of the pharmacy's current subscription or trial. */
function CurrentPlanCard({ subscription, loading }) {
  if (loading) {
    return <div className={cn(cardClass, "h-28 animate-pulse bg-muted/40")} />;
  }

  if (!subscription) {
    return (
      <div className={cn(cardClass, "flex items-center gap-4 p-5")}>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <CrownIcon className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-foreground">No subscription yet</p>
          <p className="text-sm text-muted-foreground">
            Choose a plan below to manage your inventory, suppliers and purchases.
          </p>
        </div>
      </div>
    );
  }

  const tone = subscriptionStatusTone(subscription.status);
  const left = daysUntil(subscription.endDate);
  const expiringSoon = subscription.active && left != null && left <= 5;

  return (
    <div className={cn(cardClass, "flex flex-wrap items-center justify-between gap-4 p-5")}>
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl",
            subscription.active ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
          )}
        >
          <ShieldCheckIcon className="size-5" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">
              {subscription.status === "TRIAL" ? "Free trial" : `${planMeta(subscription.plan).label} plan`}
            </p>
            <Badge tone={tone} />
          </div>
          <p className="text-sm text-muted-foreground">
            {subscription.active
              ? `Access until ${formatDate(subscription.endDate)}`
              : subscription.status === "PENDING"
                ? "Waiting for payment to complete."
                : `Ended ${formatDate(subscription.endDate)} — subscribe to keep managing inventory.`}
          </p>
        </div>
      </div>

      {subscription.active && left != null && (
        <div className="text-right">
          <p className={cn("font-heading text-2xl font-bold", expiringSoon ? "text-amber-600" : "text-foreground")}>
            {Math.max(0, left)}
          </p>
          <p className="text-xs text-muted-foreground">day{left === 1 ? "" : "s"} left</p>
        </div>
      )}
    </div>
  );
}

/** Pharmacy billing: current plan, plan checkout with coupon, payment history. */
export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const [pendingTx, setPendingTx] = useState(readPendingTx);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const payments = usePagedList(billingApi.getMyPayments, {
    listKey: "payments",
    fallback: "Could not load your payment history.",
  });
  const reloadPayments = payments.reload;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sub, planList] = await Promise.all([billingApi.getMySubscription(), billingApi.getPlans()]);
      setSubscription(sub);
      setPlans(planList);
      setSelectedPlan((current) => current ?? planList[0]?.plan ?? null);
    } catch (e) {
      setError(extractApiError(e, "Could not load your subscription."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  // Confirm a checkout the pharmacy has just returned from. Chapa does not echo
  // the reference back in the return URL, so it is remembered before redirecting.
  const verify = useCallback(
    async (txRef) => {
      setVerifying(true);
      setVerifyError("");
      try {
        const sub = await billingApi.verifyPayment(txRef);
        setSubscription(sub);
        if (sub?.active && sub.status === "ACTIVE") {
          clearPendingTx();
          setPendingTx(null);
          toast.success("Payment confirmed — your subscription is active.");
        } else {
          setVerifyError("We have not received your payment yet. If you paid, check again in a moment.");
        }
        reloadPayments();
      } catch (e) {
        setVerifyError(extractApiError(e, "Could not confirm your payment yet."));
      } finally {
        setVerifying(false);
      }
    },
    [reloadPayments]
  );

  const verifiedOnce = useRef(false);
  useEffect(() => {
    if (verifiedOnce.current || !pendingTx) return;
    const id = setTimeout(() => {
      verifiedOnce.current = true;
      verify(pendingTx);
    }, 0);
    return () => clearTimeout(id);
  }, [pendingTx, verify]);

  /** Prices `plan` with `code` and returns the preview, or null if the check failed. */
  async function runPreview(plan, code) {
    if (!plan) return null;
    setPreviewing(true);
    setPayError("");
    try {
      const result = await billingApi.previewCoupon(plan, code);
      setPreview(result);
      setAppliedCode(code && result.valid ? code : "");
      return result;
    } catch (e) {
      setPreview(null);
      setAppliedCode("");
      setPayError(extractApiError(e, "Could not check that coupon."));
      return null;
    } finally {
      setPreviewing(false);
    }
  }

  function choosePlan(plan) {
    setSelectedPlan(plan);
    if (appliedCode) runPreview(plan, appliedCode);
  }

  function applyCoupon(e) {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    runPreview(selectedPlan, code);
  }

  function removeCoupon() {
    setCouponInput("");
    setAppliedCode("");
    setPreview(null);
  }

  async function pay() {
    if (!selectedPlan) return;

    // A code that was typed but never applied still counts: check it now, so
    // the pharmacy is not sent to pay full price with a coupon sitting unused.
    let code = appliedCode;
    const typed = couponInput.trim().toUpperCase();
    if (!code && typed) {
      const result = await runPreview(selectedPlan, typed);
      if (!result) return;
      if (!result.valid) {
        setPayError(`${result.message}. Fix or remove the coupon code to continue.`);
        return;
      }
      code = typed;
    }

    setPaying(true);
    setPayError("");
    try {
      const checkout = await billingApi.subscribe({ plan: selectedPlan, couponCode: code || undefined });
      if (checkout.checkoutUrl) {
        try {
          localStorage.setItem(PENDING_TX_KEY, checkout.txRef);
        } catch {
          /* storage unavailable — the webhook still activates the plan */
        }
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      // A coupon covered the full price: the plan is already active.
      toast.success("Subscription activated.");
      removeCoupon();
      await load();
      reloadPayments();
    } catch (e) {
      // 502 = the payment service could not reach or was refused by Chapa.
      setPayError(
        e?.response?.status === 502
          ? "Online payment is not available right now. A coupon that covers the full price activates your plan without paying."
          : extractApiError(e, "Could not start the payment. Please try again.")
      );
    } finally {
      setPaying(false);
    }
  }

  const chosen = plans.find((p) => p.plan === selectedPlan) ?? null;
  const original = preview?.originalAmount ?? chosen?.price ?? null;
  const total = appliedCode && preview?.valid ? preview.discountedAmount : original;
  const discount = original != null && total != null ? Number(original) - Number(total) : 0;
  const currency = chosen?.currency ?? "ETB";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Subscription" subtitle="Your plan, payments and billing history." />

      <ErrorBanner>{error}</ErrorBanner>

      {pendingTx && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-3">
            {verifying ? (
              <Loader2Icon className="size-5 animate-spin text-amber-600" />
            ) : (
              <ReceiptIcon className="size-5 text-amber-600" />
            )}
            <p className="text-sm text-foreground">
              {verifying ? "Confirming your payment with Chapa…" : verifyError || "You have a payment in progress."}
            </p>
          </div>
          {!verifying && (
            <div className="flex items-center gap-2">
              <button onClick={() => verify(pendingTx)} className={ghostBtn}>
                <RefreshCwIcon className="size-3.5" /> Check again
              </button>
              <button
                onClick={() => {
                  clearPendingTx();
                  setPendingTx(null);
                  setVerifyError("");
                }}
                className={ghostBtn}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      <CurrentPlanCard subscription={subscription} loading={loading} />

      {/* Plan picker + checkout */}
      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-base font-semibold">
            {subscription?.status === "ACTIVE" ? "Renew or change plan" : "Choose a plan"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {loading && plans.length === 0 && (
              <>
                <div className={cn(cardClass, "h-36 animate-pulse bg-muted/40")} />
                <div className={cn(cardClass, "h-36 animate-pulse bg-muted/40")} />
              </>
            )}
            {plans.map((p) => {
              const meta = planMeta(p.plan);
              const selected = p.plan === selectedPlan;
              return (
                <button
                  key={p.plan}
                  type="button"
                  onClick={() => choosePlan(p.plan)}
                  className={cn(
                    "relative flex flex-col gap-2 rounded-2xl border bg-card p-5 text-left transition-all",
                    selected
                      ? "border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-600/10"
                      : "border-foreground/5 hover:border-foreground/15"
                  )}
                >
                  {selected && (
                    <span className="absolute right-4 top-4 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                      <CheckIcon className="size-3" />
                    </span>
                  )}
                  <p className="text-sm font-semibold text-muted-foreground">{meta.label}</p>
                  <p className="font-heading text-2xl font-bold tracking-tight text-foreground">
                    {formatMoney(p.price, p.currency)}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">/ {meta.per}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.durationDays} days of access. {meta.blurb}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className={cn(cardClass, "flex h-fit flex-col gap-4 p-5")}>
          <h2 className="font-heading text-base font-semibold">Order summary</h2>

          <form onSubmit={applyCoupon} className="flex flex-col gap-1.5">
            <label htmlFor="coupon" className="text-sm font-medium text-foreground">
              Coupon code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <TicketPercentIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="coupon"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  disabled={Boolean(appliedCode)}
                  placeholder="e.g. WELCOME20"
                  className={cn(fieldClass, "pl-9 uppercase disabled:opacity-60")}
                />
              </div>
              {appliedCode ? (
                <button type="button" onClick={removeCoupon} className={ghostBtn}>
                  Remove
                </button>
              ) : (
                <button type="submit" disabled={!couponInput.trim() || previewing || !selectedPlan} className={ghostBtn}>
                  {previewing ? "…" : "Apply"}
                </button>
              )}
            </div>
            {preview && couponInput && (
              <p className={cn("text-xs", preview.valid ? "text-emerald-600" : "text-rose-600")}>{preview.message}</p>
            )}
          </form>

          <dl className="flex flex-col gap-2 border-t border-foreground/5 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{chosen ? `${planMeta(chosen.plan).label} plan` : "Plan"}</dt>
              <dd className="font-medium text-foreground">{formatMoney(original, currency)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <dt>Coupon {appliedCode}</dt>
                <dd className="font-medium">− {formatMoney(discount, currency)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-foreground/5 pt-2 text-base">
              <dt className="font-semibold text-foreground">Total</dt>
              <dd className="font-heading font-bold text-foreground">{formatMoney(total, currency)}</dd>
            </div>
          </dl>

          <ErrorBanner>{payError}</ErrorBanner>

          <button onClick={pay} disabled={!chosen || paying || previewing} className={cn(primaryBtn, "h-11 w-full")}>
            {paying ? (
              <>
                <Loader2Icon className="size-4 animate-spin" /> Starting payment…
              </>
            ) : Number(total) === 0 && appliedCode ? (
              "Activate subscription"
            ) : (
              "Pay with Chapa"
            )}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            You will be taken to Chapa to pay securely, then brought back here.
          </p>
        </div>
      </section>

      {/* Payment history */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base font-semibold">Payment history</h2>
        <ErrorBanner>{payments.error}</ErrorBanner>
        <div className={cn(cardClass, "overflow-hidden")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Coupon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Loading payments…
                  </TableCell>
                </TableRow>
              )}
              {!payments.loading && payments.items.length === 0 && !payments.error && (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState icon={ReceiptIcon} title="No payments yet" subtitle="Your payments will appear here." className="border-0" />
                  </TableCell>
                </TableRow>
              )}
              {!payments.loading &&
                payments.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.txRef}</TableCell>
                    <TableCell className="text-muted-foreground">{p.couponCode ?? "—"}</TableCell>
                    <TableCell>
                      <Badge tone={paymentStatusTone(p.status)} />
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatMoney(p.amount, p.currency)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        <Pagination
          page={payments.page}
          totalPages={payments.meta.totalPages}
          loading={payments.loading}
          onChange={payments.setPage}
        />
      </section>
    </div>
  );
}
