import { useCallback, useEffect, useMemo, useState } from "react";
import { getCustomers } from "@/features/sales/api/salesApi";
import { extractApiError } from "@/lib/helpers/helpers";

/**
 * The pharmacy's walk-in customers, plus `nameOf(id)` for showing a name next
 * to a sale (null when the customer is unknown or was deleted).
 */
export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const list = await getCustomers();
        if (active) setCustomers(list);
      } catch (e) {
        if (active) {
          setError(extractApiError(e, "Could not load customers."));
          setCustomers([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const names = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const nameOf = useCallback((id) => (id ? names.get(id) ?? null : null), [names]);

  return { customers, nameOf, loading, error, reload };
}

export default useCustomers;
