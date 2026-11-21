import { cardClass } from "@/components/common/styles";
import { cn } from "@/lib/utils";

/** One headline number with a label and an optional line of context. */
export default function StatCard({ icon: Icon, label, value, hint, hintClassName, loading }) {
  if (loading) return <div className={cn(cardClass, "h-28 animate-pulse bg-muted/40")} />;
  return (
    <div className={cn(cardClass, "flex flex-col gap-1 p-5")}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="size-4 text-indigo-600" />}
        {label}
      </div>
      <p className="font-heading text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {hint && <p className={cn("text-xs text-muted-foreground", hintClassName)}>{hint}</p>}
    </div>
  );
}
