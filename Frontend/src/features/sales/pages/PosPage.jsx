import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  Loader2Icon,
  MinusIcon,
  PackageIcon,
  PlusIcon,
  PrinterIcon,
  ScanBarcodeIcon,
  SearchIcon,
  ShoppingCartIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";
import * as salesApi from "@/features/sales/api/salesApi";
import { PAYMENT_METHODS, parseCheckoutError, toISODate } from "@/features/sales/constants";
import { useCustomers } from "@/features/sales/hooks/useCustomers";
import Receipt from "@/features/sales/components/Receipt";
import CustomerFormDialog from "@/features/sales/components/CustomerFormDialog";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { PageHeader, ErrorBanner } from "@/components/common/PageBits";
import { primaryBtn, ghostBtn, fieldClass, labelClass, cardClass } from "@/components/common/styles";
import EmptyState from "@/features/customer/components/EmptyState";
import { PATHS } from "@/router/routes";
import { extractApiError, formatMoney } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

const MIN_SEARCH_LENGTH = 2;
const iconBtn =
  "flex size-8 items-center justify-center rounded-lg border border-foreground/10 bg-background transition-colors hover:border-indigo-500/40 disabled:opacity-40";

function isExpired(medicine) {
  return Boolean(medicine.expiryDate) && medicine.expiryDate < toISODate();
}

/** One medicine in the search results, with a button to add it to the cart. */
function MedicineRow({ medicine, inCart, onAdd }) {
  const out = !medicine.available || medicine.stockQuantity <= 0;
  const full = inCart >= medicine.stockQuantity;
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{medicine.medicineName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[medicine.genericName, medicine.brandName].filter(Boolean).join(" · ") || "—"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className={out ? "text-rose-600" : "text-muted-foreground"}>
            {out ? "Out of stock" : `${medicine.stockQuantity} in stock`}
          </span>
          {medicine.requiresPrescription && <span className="text-amber-600">Needs a prescription</span>}
          {isExpired(medicine) && <span className="text-rose-600">Expired</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-medium text-foreground">{formatMoney(medicine.price)}</span>
        <button onClick={() => onAdd(medicine)} disabled={out || full} className={ghostBtn}>
          <PlusIcon className="size-3.5" /> {inCart > 0 ? `Add (${inCart})` : "Add"}
        </button>
      </div>
    </li>
  );
}

/** The till: find medicines, build a cart, take payment and hand over a receipt. */
export default function PosPage() {
  const { user } = useAuth();
  const pharmacyId = user?.userId;
  const customers = useCustomers();

  const [query, setQuery] = useState("");
  const [browse, setBrowse] = useState({ loading: true, items: [], error: "" });
  const [found, setFound] = useState({ q: "", items: [], error: "" });
  const [stockKey, setStockKey] = useState(0); // bump to re-read stock levels

  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const barcodeRef = useRef(null);

  const [cart, setCart] = useState([]); // [{ medicine, quantity }]
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState(null); // { message, subscriptionRequired? }
  const [done, setDone] = useState(null); // { receipt, customerName } after a sale

  const q = query.trim();
  const searchingByName = q.length >= MIN_SEARCH_LENGTH;

  // In-stock medicines to pick from before anything is typed.
  useEffect(() => {
    if (!pharmacyId) return undefined;
    let active = true;
    async function load() {
      try {
        const data = await salesApi.getSellableMedicines(pharmacyId);
        if (active) setBrowse({ loading: false, items: data?.medicines ?? [], error: "" });
      } catch (e) {
        if (active) setBrowse({ loading: false, items: [], error: extractApiError(e, "Could not load your medicines.") });
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [pharmacyId, stockKey]);

  // Search by name as the cashier types.
  useEffect(() => {
    if (!pharmacyId || q.length < MIN_SEARCH_LENGTH) return undefined;
    let active = true;
    const id = setTimeout(async () => {
      try {
        const items = await salesApi.lookupMedicines(pharmacyId, q);
        if (active) setFound({ q, items, error: "" });
      } catch (e) {
        if (active) setFound({ q, items: [], error: extractApiError(e, "Could not search your medicines.") });
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [pharmacyId, q, stockKey]);

  const searchReady = found.q === q;
  const listLoading = searchingByName ? !searchReady : browse.loading;
  const listError = searchingByName ? (searchReady ? found.error : "") : browse.error;
  const medicines = searchingByName ? (searchReady ? found.items : []) : browse.items;

  const inCart = (id) => cart.find((line) => line.medicine.id === id)?.quantity ?? 0;

  function addToCart(medicine) {
    if (!medicine.available || medicine.stockQuantity <= 0) {
      toast.error(`${medicine.medicineName} is out of stock.`);
      return;
    }
    if (inCart(medicine.id) >= medicine.stockQuantity) {
      toast.error(`Only ${medicine.stockQuantity} of ${medicine.medicineName} in stock.`);
      return;
    }
    setPayError(null);
    setCart((lines) => {
      const existing = lines.find((line) => line.medicine.id === medicine.id);
      if (!existing) return [...lines, { medicine, quantity: 1 }];
      return lines.map((line) =>
        line.medicine.id === medicine.id
          ? { medicine, quantity: Math.min(line.quantity + 1, medicine.stockQuantity) }
          : line
      );
    });
  }

  function setQuantity(id, value) {
    setPayError(null);
    setCart((lines) =>
      lines.map((line) => {
        if (line.medicine.id !== id) return line;
        const wanted = Number.isFinite(value) ? Math.floor(value) : 1;
        return { ...line, quantity: Math.max(1, Math.min(wanted, line.medicine.stockQuantity)) };
      })
    );
  }

  function removeLine(id) {
    setPayError(null);
    setCart((lines) => lines.filter((line) => line.medicine.id !== id));
  }

  async function handleScan(e) {
    e.preventDefault();
    const code = barcode.trim();
    if (!code || !pharmacyId) return;
    setScanning(true);
    setScanError("");
    try {
      const medicine = await salesApi.getMedicineByBarcode(pharmacyId, code);
      if (!medicine) {
        setScanError("No medicine with that barcode.");
      } else {
        addToCart(medicine);
        setBarcode("");
      }
    } catch (err) {
      setScanError(extractApiError(err, "Could not look up that barcode."));
    } finally {
      setScanning(false);
      barcodeRef.current?.focus();
    }
  }

  /** After a refused sale, re-read the cart's prices and stock so the till shows why. */
  async function refreshCart() {
    const ids = cart.map((line) => line.medicine.id);
    const results = await Promise.allSettled(ids.map((id) => salesApi.getMedicine(pharmacyId, id)));
    const fresh = new Map();
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value?.id) fresh.set(r.value.id, r.value);
    });
    setCart((lines) =>
      lines.map((line) => {
        const medicine = fresh.get(line.medicine.id);
        if (!medicine) return line;
        return { medicine, quantity: Math.max(1, Math.min(line.quantity, medicine.stockQuantity)) };
      })
    );
  }

  async function completeSale() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setPayError(null);
    try {
      const receipt = await salesApi.checkout({
        paymentMethod,
        customerId: customerId || undefined,
        items: cart.map((line) => ({ medicineId: line.medicine.id, quantity: line.quantity })),
      });
      setDone({ receipt, customerName: customers.nameOf(customerId) ?? undefined });
      setCart([]);
      setCustomerId("");
      setPaymentMethod("CASH");
      setQuery("");
      toast.success("Sale recorded.");
    } catch (err) {
      setPayError(parseCheckoutError(err));
      refreshCart();
    } finally {
      setSubmitting(false);
      // Stock has changed (or was not what the till thought) — read it again.
      setStockKey((k) => k + 1);
    }
  }

  const total = cart.reduce((sum, line) => sum + Number(line.medicine.price ?? 0) * line.quantity, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Point of sale" subtitle="Sell medicines over the counter." />
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600" />
            <p className="text-sm text-foreground">Sale recorded. Stock has been updated.</p>
          </div>
          <Receipt receipt={done.receipt} customerName={done.customerName} />
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={() => window.print()} className={cn(ghostBtn, "h-11")}>
              <PrinterIcon className="size-4" /> Print receipt
            </button>
            <button onClick={() => setDone(null)} className={cn(primaryBtn, "h-11")} autoFocus>
              <ShoppingCartIcon className="size-4" /> New sale
            </button>
          </div>
          <Link to={PATHS.PHARMACY_SALES} className="text-center text-sm font-medium text-indigo-600 hover:underline">
            View all sales
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Point of sale" subtitle="Sell medicines over the counter." />

      <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Find medicines */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, generic name or brand"
                aria-label="Search medicines"
                className={cn(fieldClass, "pl-9")}
                autoFocus
              />
            </div>
            <form onSubmit={handleScan} className="relative">
              {scanning ? (
                <Loader2Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : (
                <ScanBarcodeIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <input
                ref={barcodeRef}
                value={barcode}
                onChange={(e) => {
                  setBarcode(e.target.value);
                  setScanError("");
                }}
                placeholder="Scan or type a barcode"
                aria-label="Barcode"
                disabled={scanning}
                className={cn(fieldClass, "pl-9")}
              />
            </form>
          </div>
          <ErrorBanner>{scanError}</ErrorBanner>

          <h2 className="font-heading text-base font-semibold">
            {searchingByName ? "Search results" : "In stock"}
          </h2>
          <ErrorBanner>{listError}</ErrorBanner>

          {listLoading && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={cn(cardClass, "h-16 animate-pulse bg-muted/40")} />
              ))}
            </div>
          )}

          {!listLoading && !listError && medicines.length === 0 && (
            <>
              <EmptyState
                icon={searchingByName ? SearchIcon : PackageIcon}
                title={searchingByName ? "No medicines match" : "Nothing in stock"}
                subtitle={
                  searchingByName
                    ? "Check the spelling, or try the generic or brand name."
                    : "Add medicines to your inventory before selling them here."
                }
              />
              {!searchingByName && (
                <Link to={PATHS.PHARMACY_INVENTORY} className="text-center text-sm font-medium text-indigo-600 hover:underline">
                  Go to inventory
                </Link>
              )}
            </>
          )}

          {!listLoading && medicines.length > 0 && (
            <ul className={cn(cardClass, "flex flex-col divide-y divide-foreground/5")}>
              {medicines.map((m) => (
                <MedicineRow key={m.id} medicine={m} inCart={inCart(m.id)} onAdd={addToCart} />
              ))}
            </ul>
          )}
          {!searchingByName && !listLoading && medicines.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing some of your in-stock medicines. Search to find any other.
            </p>
          )}
        </div>

        {/* Cart and payment */}
        <div className={cn(cardClass, "flex h-fit flex-col gap-4 p-5")}>
          <h2 className="font-heading text-base font-semibold">
            Cart{itemCount > 0 && <span className="ml-1.5 text-sm font-normal text-muted-foreground">{itemCount} item{itemCount === 1 ? "" : "s"}</span>}
          </h2>

          {cart.length === 0 ? (
            <p className="rounded-xl border border-dashed border-foreground/10 px-4 py-8 text-center text-sm text-muted-foreground">
              Add a medicine to start a sale.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-foreground/5">
              {cart.map(({ medicine, quantity }) => (
                <li key={medicine.id} className="flex flex-col gap-2 py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{medicine.medicineName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(medicine.price)} each · {medicine.stockQuantity} in stock
                      </p>
                    </div>
                    <button
                      onClick={() => removeLine(medicine.id)}
                      aria-label={`Remove ${medicine.medicineName}`}
                      className="text-muted-foreground transition-colors hover:text-rose-600"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setQuantity(medicine.id, quantity - 1)}
                        disabled={quantity <= 1}
                        aria-label="One less"
                        className={iconBtn}
                      >
                        <MinusIcon className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={medicine.stockQuantity}
                        step="1"
                        value={quantity}
                        onChange={(e) => setQuantity(medicine.id, e.target.valueAsNumber)}
                        aria-label={`Quantity of ${medicine.medicineName}`}
                        className="h-8 w-14 rounded-lg border border-foreground/10 bg-background text-center text-sm outline-none focus:border-indigo-500/50"
                      />
                      <button
                        onClick={() => setQuantity(medicine.id, quantity + 1)}
                        disabled={quantity >= medicine.stockQuantity}
                        aria-label="One more"
                        className={iconBtn}
                      >
                        <PlusIcon className="size-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {formatMoney(Number(medicine.price ?? 0) * quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-foreground/5 pt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="pos-customer" className="text-sm font-medium text-foreground">
                Customer <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              {!customers.error && (
                <button
                  type="button"
                  onClick={() => setCustomerFormOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                >
                  <UserPlusIcon className="size-3.5" /> New customer
                </button>
              )}
            </div>
            <select
              id="pos-customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={customers.loading || Boolean(customers.error)}
              className={cn(fieldClass, "disabled:opacity-60")}
            >
              <option value="">Walk-in (no record)</option>
              {customers.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.phone ? `${c.name} · ${c.phone}` : c.name}
                </option>
              ))}
            </select>
            {customers.error && (
              <p className="mt-1 text-xs text-muted-foreground">
                Your customer list could not be loaded, so this sale will be recorded as a walk-in.
              </p>
            )}
          </div>

          <div>
            <p className={labelClass}>Paid by</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMethod(m.value)}
                  aria-pressed={paymentMethod === m.value}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-sm font-medium transition-all",
                    paymentMethod === m.value
                      ? "border-indigo-500/60 bg-indigo-500/5 text-indigo-700 ring-1 ring-indigo-500/40"
                      : "border-foreground/10 text-muted-foreground hover:border-foreground/20"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <dl className="flex flex-col gap-2 border-t border-foreground/5 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Items</dt>
              <dd className="font-medium text-foreground">{itemCount}</dd>
            </div>
            <div className="flex justify-between border-t border-foreground/5 pt-2 text-base">
              <dt className="font-semibold text-foreground">Total</dt>
              <dd className="font-heading font-bold text-foreground">{formatMoney(total)}</dd>
            </div>
          </dl>

          {payError && (
            <div className="flex flex-col gap-2">
              <ErrorBanner>{payError.message}</ErrorBanner>
              {payError.subscriptionRequired && (
                <Link to={PATHS.PHARMACY_SUBSCRIPTION} className="text-sm font-medium text-indigo-600 hover:underline">
                  Go to subscription
                </Link>
              )}
            </div>
          )}

          <button onClick={completeSale} disabled={cart.length === 0 || submitting} className={cn(primaryBtn, "h-11 w-full")}>
            {submitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" /> Recording sale…
              </>
            ) : (
              "Complete sale"
            )}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            This records the sale and takes the items out of stock. Collect the payment yourself.
          </p>
        </div>
      </section>

      <CustomerFormDialog
        open={customerFormOpen}
        customer={null}
        onClose={() => setCustomerFormOpen(false)}
        onSaved={(saved) => {
          customers.reload();
          if (saved?.id) setCustomerId(saved.id);
        }}
      />
    </div>
  );
}
