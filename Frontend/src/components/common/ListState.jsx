import EmptyState from "@/features/customer/components/EmptyState";
import { ErrorBanner } from "@/components/common/PageBits";

/**
 * Loading / error / empty wrapper for card lists. Renders `children` only when
 * there is something to show.
 */
export default function ListState({ loading, error, isEmpty, empty, children }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-foreground/5 bg-muted/40" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorBanner>{error}</ErrorBanner>;
  if (isEmpty) return <EmptyState icon={empty?.icon} title={empty?.title ?? "Nothing here yet"} subtitle={empty?.subtitle} />;
  return children;
}
