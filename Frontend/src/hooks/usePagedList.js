import { useCallback, useEffect, useRef, useState } from "react";
import { extractApiError } from "@/lib/helpers/helpers";

const PAGE_SIZE = 20;

/**
 * Generic paged list loader.
 *
 * @param fetcher  ({ page, size }) => Promise<response>
 * @param options.listKey   response field holding the rows (e.g. "reports");
 *                          falls back to `content`, then to the response itself
 *                          when it is a plain array.
 * @param options.deps      values that reset to page 0 and refetch when changed
 * @param options.fallback  error message when the request fails
 */
export function usePagedList(fetcher, { listKey = "content", deps = [], fallback = "Could not load data." } = {}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [meta, setMeta] = useState({ totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Keep the latest fetcher without making it an effect dependency.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const depsKey = JSON.stringify(deps);
  const [seenDepsKey, setSeenDepsKey] = useState(depsKey);
  if (seenDepsKey !== depsKey) {
    setSeenDepsKey(depsKey);
    setPage(0);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetcherRef.current({ page, size: PAGE_SIZE });
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.[listKey] ?? data?.content ?? [];
        setItems(rows);
        setMeta({
          totalElements: data?.totalElements ?? rows.length,
          totalPages: data?.totalPages ?? (rows.length ? 1 : 0),
        });
      } catch (e) {
        if (active) {
          setError(extractApiError(e, fallback));
          setItems([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [page, depsKey, reloadKey, listKey, fallback]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { items, page, setPage, meta, loading, error, reload };
}

export default usePagedList;
