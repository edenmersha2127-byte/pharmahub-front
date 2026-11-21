const btn =
  "rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:border-indigo-500/40 disabled:opacity-50";

/** Previous / Next pager. Renders nothing when there is a single page. */
export default function Pagination({ page, totalPages, loading, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3">
      <button disabled={page === 0 || loading} onClick={() => onChange(Math.max(0, page - 1))} className={btn}>
        Previous
      </button>
      <span className="text-sm text-muted-foreground">
        Page {page + 1} of {totalPages}
      </span>
      <button disabled={page >= totalPages - 1 || loading} onClick={() => onChange(page + 1)} className={btn}>
        Next
      </button>
    </div>
  );
}
