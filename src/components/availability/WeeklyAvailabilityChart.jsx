import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import { api } from "../../lib/api";

// Essaie d'importer Recharts; si absent, on tombera sur le fallback CSS
let Recharts = {};
try {
  // eslint-disable-next-line global-require
  Recharts = require("recharts");
} catch (_) { /* no-op */ }

const {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} = Recharts;

export default function WeeklyAvailabilityChart() {
  const [series, setSeries] = useState({ labels: [], values: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get("/api/metrics/weekly_trend"); // { labels:[], values:[] }
        const labels = Array.isArray(res?.labels) ? res.labels : [];
        const values = Array.isArray(res?.values) ? res.values : [];
        setSeries({ labels, values });
      } catch (e) {
        setErr("Impossible de charger la tendance hebdomadaire.");
        setSeries({ labels: [], values: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const data = useMemo(
    () => (series.labels || []).map((lab, i) => ({ label: lab, value: Number(series.values?.[i] ?? 0) })),
    [series]
  );

  const avg = useMemo(() => {
    if (!data.length) return 0;
    const s = data.reduce((a, b) => a + (isFinite(b.value) ? b.value : 0), 0);
    return Math.round((s / data.length) * 10) / 10; // 1 décimale
  }, [data]);

  const last = data.at(-1)?.value ?? 0;

  return (
    <ComponentCard
      title="Évolution — Disponibles par jour (Semaine)"
      desc="Tendance des disponibilités sur la semaine en cours."
      right={
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1">
            Moyenne: <strong>{isFinite(avg) ? `${avg}%` : "—"}</strong>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1">
            Dernier jour: <strong>{isFinite(last) ? `${last}%` : "—"}</strong>
          </span>
        </div>
      }
    >
      {/* État erreur */}
      {!!err && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          {err}
        </div>
      )}

      {/* Skeleton loading */}
      {loading ? (
        <div className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
          <div className="h-48 w-full animate-pulse rounded bg-gray-100 dark:bg-white/10" />
        </div>
      ) : !data.length ? (
        // Vide
        <div className="rounded-lg border border-gray-100 p-4 text-sm text-gray-500 dark:border-gray-800">
          Aucune donnée
        </div>
      ) : !!ResponsiveContainer ? (
        // ----- Version Recharts (si dispos) -----
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 18, right: 10, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="gradLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopOpacity={0.9} stopColor="currentColor" />
                  <stop offset="100%" stopOpacity={0.1} stopColor="currentColor" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tickMargin={8} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(v) => [`${v}%`, "Disponibilité"]}
                labelFormatter={(l) => `Jour: ${l}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="currentColor"
                strokeWidth={2.2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        // ----- Fallback léger sans Recharts -----
        <div className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
          <div className="grid grid-cols-7 gap-3">
            {data.map((d) => (
              <div key={d.label} className="flex flex-col items-center">
                <div className="h-40 w-6 overflow-hidden rounded bg-gray-100 dark:bg-white/10">
                  <div
                    className="w-full bg-emerald-500"
                    style={{ height: `${Math.max(0, Math.min(100, d.value))}%` }}
                    title={`${d.label}: ${d.value}%`}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">{d.label}</div>
                <div className="text-[11px] font-semibold">{d.value}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ComponentCard>
  );
}
