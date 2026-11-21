import { cn } from "@/lib/utils";

/** Page title + subtitle with an optional action slot on the right. */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

/** Segmented tab switcher. `tabs` is [{ key, label, count? }]. */
export function Tabs({ tabs, active, onChange, className }) {
  return (
    <div
      className={cn(
        "flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-foreground/10 bg-background p-1",
        className
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            active === t.key
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
          {t.count != null && (
            <span className={cn("ml-1.5 text-xs", active === t.key ? "text-white/80" : "text-muted-foreground/70")}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Inline error banner. Renders nothing when there is no message. */
export function ErrorBanner({ children }) {
  if (!children) return null;
  return <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{children}</p>;
}

/** Small coloured status pill. `tone` is { label, badge, dot? }. */
export function Badge({ tone, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        tone.badge,
        className
      )}
    >
      {tone.dot && <span className={cn("size-1.5 rounded-full", tone.dot)} />}
      {tone.label}
    </span>
  );
}
