import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import { api, notify } from "../../lib/api";
import { RefreshCw } from "lucide-react";

const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n || 0))));

export default function ModelBreakdown() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await notify(api.get("/api/metrics/by_model"), { loading: "Chargement…" });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setRows(
        list
          .map((r) => ({
            model: r.model ?? "—",
            total: Number(r.total || 0),
            available_pct: clampPct(r.available_pct),
          }))
          // tri décroissant par dispo puis par total
          .sort((a, b) => (b.available_pct - a.available_pct) || (b.total - a.total))
      );
    } catch {
      setErr("Impossible de charger la répartition par modèle.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const totalTpe = rows.reduce((s, r) => s + r.total, 0);
    // moyenne pondérée par le total de TPE
    const weighted =
      totalTpe === 0 ? 0 :
      Math.round(rows.reduce((s, r) => s + (r.available_pct * r.total), 0) / totalTpe);
    return { totalTpe, weighted };
  }, [rows]);

  const Bar = ({ pct }) => {
    const tone =
      pct >= 90 ? "bg-emerald-500" :
      pct >= 70 ? "bg-amber-500" :
      "bg-rose-500";
    return (
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Disponibilité"
        title={`${pct}% disponibles`}
      >
        <div className={`h-2 ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <ComponentCard
      title="Répartition par modèle"
      desc="Disponibilité moyenne par modèle de TPE."
      right={
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      }
    >
      {/* Banner erreur */}
      {err && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          {err}
        </div>
      )}

      {/* KPIs en tête */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Nombre total de TPE</div>
          <div className="text-lg font-semibold">{totals.totalTpe}</div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Disponibilité moyenne (pondérée)</div>
          <div className="text-lg font-semibold">{totals.weighted}%</div>
        </div>
      </div>

      {/* Liste / skeleton */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-5 w-20 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
          ))}
        </div>
      ) : rows.length ? (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div key={r.model} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-300">{r.model}</div>
                <div className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300">
                  {r.total} TPE
                </div>
              </div>
              <div className="mt-2 font-semibold">{r.available_pct}% disponibles</div>
              <div className="mt-2">
                <Bar pct={r.available_pct} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">Aucune donnée</div>
      )}
    </ComponentCard>
  );
}
