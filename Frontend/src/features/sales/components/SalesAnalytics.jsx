import { useEffect, useState } from "react";
import { BanknoteIcon, ShoppingBagIcon, TrendingUpIcon } from "lucide-react";
import * as salesApi from "@/features/sales/api/salesApi";
import { GRANULARITIES, formatPeriod, monthStartISO, toISODate } from "@/features/sales/constants";
import StatCard from "@/features/sales/components/StatCard";
import { ErrorBanner } from "@/components/common/PageBits";
import { fieldClass, labelClass, cardClass } from "@/components/common/styles";
import { extractApiError, formatMoney, shortId } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

const TOP_LIMIT = 10;

/** Revenue per day or month as plain bars; hover a bar for its figures. */
function RevenueChart({ series }) {
  const max = Math.max(0, ...series.map((b) => Number(b.revenue ?? 0)));
  if (max <= 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No sales in this period.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <div className="min-w-full" style={{ width: series.length > 45 ? `${series.length * 12}px` : undefined }}>
        <div className="flex h-44 items-end gap-1" role="img" aria-label="Revenue over time">
          {series.map((b) => {
            const revenue = Number(b.revenue ?? 0);
            return (
              <div
                key={b.period}
                title={`${formatPeriod(b.period)}: ${formatMoney(revenue)} revenue, ${formatMoney(b.profit)} profit, ${b.salesCount} sale${b.salesCount === 1 ? "" : "s"}`}
                className="flex h-full min-w-1.5 flex-1 items-end rounded-t-md hover:bg-indigo-500/5"
              >
                <div
                  className={cn("w-full rounded-t-md", revenue > 0 ? "bg-indigo-500" : "bg-foreground/10")}
                  style={{ height: revenue > 0 ? `${Math.max(2, (revenue / max) * 100)}%` : "2px" }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between border-t border-foreground/10 pt-2 text-xs text-muted-foreground">
          <span>{formatPeriod(series[0].period)}</span>
          <span>Highest: {formatMoney(max)}</span>
          <span>{formatPeriod(series[series.length - 1].period)}</span>
        </div>
      </div>
    </div>
  );
}

function TopMedicines({ medicines }) {
  if (medicines.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No medicines sold in this period.</p>;
  }
  const max = Math.max(1, ...medicines.map((m) => Number(m.quantitySold ?? 0)));
  return (
    <ol className="flex flex-col gap-3">
      {medicines.map((m, i) => (
        <li key={m.medicineId} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-foreground">
              {i + 1}. {m.medicineName ?? `Medicine ${shortId(m.medicineId)}`}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {m.quantitySold} sold · {formatMoney(m.revenue)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-foreground/5">
            <div
              className="h-2 rounded-full bg-indigo-500"
              style={{ width: `${Math.max(2, (Number(m.quantitySold ?? 0) / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Totals, revenue trend and best sellers for a chosen date range. */
export default function SalesAnalytics() {
  const [from, setFrom] = useState(monthStartISO);
  const [to, setTo] = useState(() => toISODate());
  const [granularity, setGranularity] = useState("DAY");
  const [result, setResult] = useState({ key: "", totals: null, series: [], top: [], error: "" });

  const rangeError = !from || !to ? "Choose a start and an end date." : from > to ? "The start date must be on or before the end date." : "";
  const key = `${from}|${to}|${granularity}`;

  useEffect(() => {
    if (rangeError) return undefined;
    let active = true;
    async function load() {
      try {
        const [totals, series, top] = await Promise.all([
          salesApi.getAnalytics({ from, to }),
          salesApi.getTimeseries({ from, to, granularity }),
          salesApi.getTopMedicines({ from, to, limit: TOP_LIMIT }),
        ]);
        if (active) setResult({ key, totals, series, top, error: "" });
      } catch (e) {
        if (active) {
          setResult({ key, totals: null, series: [], top: [], error: extractApiError(e, "Could not load your sales figures.") });
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [from, to, granularity, key, rangeError]);

  const loading = !rangeError && result.key !== key;
  const ready = !rangeError && result.key === key && !result.error;
  const totals = ready ? result.totals : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="analytics-from" className={labelClass}>From</label>
          <input id="analytics-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="analytics-to" className={labelClass}>To</label>
          <input id="analytics-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="analytics-granularity" className={labelClass}>Show trend</label>
          <select id="analytics-granularity" value={granularity} onChange={(e) => setGranularity(e.target.value)} className={fieldClass}>
            {GRANULARITIES.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
      </div>

      <ErrorBanner>{rangeError || (result.key === key ? result.error : "")}</ErrorBanner>

      {(loading || ready) && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard loading={loading} icon={ShoppingBagIcon} label="Sales" value={totals?.salesCount ?? 0} />
            <StatCard loading={loading} icon={BanknoteIcon} label="Revenue" value={formatMoney(totals?.revenue)} />
            <StatCard
              loading={loading}
              icon={TrendingUpIcon}
              label="Profit"
              value={formatMoney(totals?.profit)}
              hint="Selling price minus what you paid for the stock."
            />
          </div>

          <section className={cn(cardClass, "flex flex-col gap-4 p-5")}>
            <h2 className="font-heading text-base font-semibold">Revenue {granularity === "MONTH" ? "by month" : "by day"}</h2>
            {loading ? <div className="h-44 animate-pulse rounded-xl bg-muted/40" /> : <RevenueChart series={result.series} />}
          </section>

          <section className={cn(cardClass, "flex flex-col gap-4 p-5")}>
            <h2 className="font-heading text-base font-semibold">Best-selling medicines</h2>
            {loading ? <div className="h-44 animate-pulse rounded-xl bg-muted/40" /> : <TopMedicines medicines={result.top} />}
          </section>
        </>
      )}

    </div>
  );
}
