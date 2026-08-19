import { useCallback, useEffect, useRef, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";

const DASHBOARD_TIMEOUT_MS = 15000;

export interface DashboardDataState<T> {
  data: T | undefined;
  loadError: string | null;
  loading: boolean;
  refetch: () => void;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

/**
 * One-shot dashboard fetch using `useConvex().query()` (not `useQuery`).
 * Includes a 15s safety timeout so a hung request surfaces a clear error.
 */
export function useDashboardData<T = any>(): DashboardDataState<T> {
  const convexClient = useConvex();
  const [data, setData] = useState<T | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoadError(null);
      setData(undefined);
      setLoading(true);
      fetchedRef.current = false;
      const result = await Promise.race([
        convexClient.query(api.dashboard.getDashboardData),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Dashboard request timed out. Please refresh.")), DASHBOARD_TIMEOUT_MS)
        ),
      ]);
      setData(result as T);
      fetchedRef.current = true;
    } catch (err: any) {
      console.error("[Dashboard] Fetch error:", err);
      setLoadError(err?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [convexClient]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchDashboard();
    }
  }, [fetchDashboard]);

  return { data, loadError, loading, refetch: fetchDashboard, setData };
}