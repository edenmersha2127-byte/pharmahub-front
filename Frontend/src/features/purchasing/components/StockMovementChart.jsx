import { useEffect, useState } from "react";
import { getMovementsSummary } from "@/features/purchasing/api/purchasingApi";
import { MOVEMENT_RANGES, monthLabel, monthShort, formatCount } from "@/features/purchasing/constants";
import { ErrorBanner } from "@/components/common/PageBits";
import { cardClass, ghostBtn, fieldClass } from "@/components/common/styles";
import { extractApiError } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

// Series colours, checked for colour-blind separation and contrast in both themes.
const IN_BAR = "bg-indigo-600 dark:bg-indigo-500";
const OUT_BAR = "bg-amber-600";

const signed = (n) => (n > 0 ? `+${formatCount(n)}` : formatCount(n));

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className={cn("size-2.5 rounded-sm", IN_BAR)} /> Units in
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className={cn("size-2.5 rounded-sm", OUT_BAR)} /> Units out
      </span>
    </div>
  );
}

/** Units added to and taken out of stock per month, as paired bars or a table. */
export default function StockMovementChart({ pharmacyId }) {
  const [months, setMonths] = useState(6);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [asTable, setAsTable] = useState(false);
  const [focused, setFocused] = useState(null); // index of the hovered month

  useEffect(() => {
    let active = true;
    async function load() {
      if (!pharmacyId) return;
      setLoading(true);
      setError("");
      try {
        const data = await getMovementsSummary(pharmacyId, months);
        if (active) setRows(data);
      } catch (e) {
        if (active) {
          setError(extractApiError(e, "Could not load stock movement."));
          setRows([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [pharmacyId, months]);

  const max = Math.max(1, ...rows.map((r) => Math.max(r.unitsIn, r.unitsOut)));
  const hasData = rows.some((r) => r.unitsIn > 0 || r.unitsOut > 0);
  const totals = rows.reduce((t, r) => ({ in: t.in + r.unitsIn, out: t.out + r.unitsOut }), { in: 0, out: 0 });
  const shown = focused != null ? rows[focused] : null;
  const height = (v) => (v > 0 ? `max(2px, ${(v / max) * 100}%)` : "0");

  return (
    <section className={cn(cardClass, "flex flex-col gap-4 p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">Stock movement</h2>
          <p className="text-xs text-muted-foreground">Units added to and taken out of stock each month.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={months}
            onChange={(e) => {
              setFocused(null);
              setMonths(Number(e.target.value));
            }}
            aria-label="Time range"
            className={cn(fieldClass, "w-auto py-1.5")}
          >
            {MOVEMENT_RANGES.map((m) => (
              <option key={m} value={m}>
                Last {m} months
              </option>
            ))}
          </select>
          <button onClick={() => setAsTable((v) => !v)} className={ghostBtn}>
            {asTable ? "Show chart" : "Show table"}
          </button>
        </div>
      </div>

      <ErrorBanner>{error}</ErrorBanner>

      {loading && <div className="h-48 animate-pulse rounded-xl bg-muted/40" />}

      {!loading && !error && !hasData && (
        <p className="py-10 text-center text-sm text-muted-foreground">No stock was added or taken out in this period.</p>
      )}

      {!loading && !error && hasData && !asTable && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Legend />
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {shown ? (
                <>
                  <span className="font-medium text-foreground">{monthLabel(shown.period)}</span> · {formatCount(shown.unitsIn)} in ·{" "}
                  {formatCount(shown.unitsOut)} out · net {signed(shown.net)}
                </>
              ) : (
                <>
                  Whole period · {formatCount(totals.in)} in · {formatCount(totals.out)} out
                </>
              )}
            </p>
          </div>

          <div>
            <p className="mb-1 text-[11px] tabular-nums text-muted-foreground">{formatCount(max)} units</p>
            <div className="flex h-40 items-stretch border-b border-foreground/15" onMouseLeave={() => setFocused(null)}>
              {rows.map((r, i) => (
                <button
                  key={r.period}
                  type="button"
                  onMouseEnter={() => setFocused(i)}
                  onFocus={() => setFocused(i)}
                  onBlur={() => setFocused(null)}
                  title={`${monthLabel(r.period)}: ${formatCount(r.unitsIn)} in, ${formatCount(r.unitsOut)} out, net ${signed(r.net)}`}
                  aria-label={`${monthLabel(r.period)}: ${r.unitsIn} units in, ${r.unitsOut} units out`}
                  className={cn(
                    "flex min-w-0 flex-1 cursor-default items-end justify-center gap-0.5 rounded-t-md outline-none transition-colors focus-visible:bg-muted",
                    focused === i && "bg-muted/60"
                  )}
                >
                  <span className={cn("w-1/4 max-w-3.5 rounded-t", IN_BAR)} style={{ height: height(r.unitsIn) }} />
                  <span className={cn("w-1/4 max-w-3.5 rounded-t", OUT_BAR)} style={{ height: height(r.unitsOut) }} />
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex">
              {rows.map((r, i) => (
                <span
                  key={r.period}
                  className={cn(
                    "min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground",
                    // With many months, label every third one so they do not collide.
                    rows.length > 12 && i % 3 !== 0 && "invisible"
                  )}
                >
                  {monthShort(r.period)}
                  {(i === 0 || r.period.endsWith("-01")) && <span className="hidden sm:inline"> {r.period.slice(2, 4)}</span>}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && !error && hasData && asTable && (
        <div className="overflow-x-auto rounded-xl border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Month</th>
                <th className="px-3 py-2 text-right font-medium">Units in</th>
                <th className="px-3 py-2 text-right font-medium">Units out</th>
                <th className="px-3 py-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.period} className="border-b border-foreground/5 last:border-0">
                  <td className="px-3 py-2 text-foreground">{monthLabel(r.period)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCount(r.unitsIn)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCount(r.unitsOut)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{signed(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
