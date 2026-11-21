import { useCallback, useEffect, useMemo, useState } from "react";
import { getInventory } from "@/features/pharmacy/api/inventoryApi";
import { extractApiError } from "@/lib/helpers/helpers";

const PAGE_SIZE = 100; // the largest page the inventory endpoint allows
const MAX_PAGES = 50;

/**
 * Loads the pharmacy's whole medicine list (page by page) so that orders and
 * batches, which only carry a medicineId, can show names — and so the order
 * form can offer every medicine to choose from.
 *
 * @returns { medicines (sorted by name), byId: (id) => medicine | undefined, loading, error }
 */
export function useMedicineLookup(pharmacyId) {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!pharmacyId) return;
      setLoading(true);
      setError("");
      try {
        const all = [];
        for (let page = 0; page < MAX_PAGES; page += 1) {
          const data = await getInventory(pharmacyId, { page, size: PAGE_SIZE });
          if (!active) return;
          all.push(...(data?.medicines ?? []));
          if (page + 1 >= (data?.totalPages ?? 0)) break;
        }
        all.sort((a, b) => String(a.medicineName ?? "").localeCompare(String(b.medicineName ?? "")));
        setMedicines(all);
      } catch (e) {
        if (active) {
          setError(extractApiError(e, "Could not load your medicines."));
          setMedicines([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [pharmacyId]);

  const map = useMemo(() => new Map(medicines.map((m) => [m.id, m])), [medicines]);
  const byId = useCallback((id) => map.get(id), [map]);

  return { medicines, byId, loading, error };
}

export default useMedicineLookup;
