import { useEffect, useState } from "react";
import { getPharmacyById } from "@/features/admin/api/adminApi";

// Shared across pages for the session: pharmacy id → name (null = lookup failed).
const cache = new Map();

/**
 * Resolves pharmacy ids to names for admin tables whose rows only carry the id
 * (reports, subscriptions, payments). Returns a lookup `nameOf(id)` that yields
 * the name once known, otherwise undefined.
 */
export function usePharmacyNames(ids, { enabled = true } = {}) {
  const [, bump] = useState(0);
  const key = [...new Set((ids ?? []).filter(Boolean))].sort().join(",");

  useEffect(() => {
    if (!enabled || !key) return;
    let active = true;
    const missing = key.split(",").filter((id) => !cache.has(id));
    if (missing.length === 0) return;

    Promise.allSettled(missing.map((id) => getPharmacyById(id))).then((results) => {
      results.forEach((r, i) => {
        cache.set(missing[i], r.status === "fulfilled" ? r.value?.pharmacyName ?? null : null);
      });
      if (active) bump((n) => n + 1);
    });

    return () => {
      active = false;
    };
  }, [key, enabled]);

  return (id) => cache.get(id) ?? undefined;
}

/** Seed the cache with names already known from another response. */
export function rememberPharmacyName(id, name) {
  if (id && name) cache.set(id, name);
}

export default usePharmacyNames;
