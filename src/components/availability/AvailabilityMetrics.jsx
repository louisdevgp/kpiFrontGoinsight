import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import DatePicker from "../../components/form/date-picker";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { api, notify } from "../../lib/api";
import { toMondayISO } from "../../utils/date";
import {
  RefreshCw,
  CalendarDays,
  CalendarRange,
  ShieldCheck,
  Gauge,
  Activity,
  TrendingUp,
} from "lucide-react";

export default function AvailabilityMetrics() {
  const [date, setDate] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [policyId, setPolicyId] = useState("");           // <- l’ID sélectionné depuis la liste
  const [policies, setPolicies] = useState([]);           // <- liste des policies
  const [polLoading, setPolLoading] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // charge les policies au montage
  useEffect(() => {
    const loadPolicies = async () => {
      setPolLoading(true);
      try {
        const res = await api.get("/api/policies");
        // compat : /api/policies peut renvoyer {rows} ou Array
        const list = Array.isArray(res?.rows)
          ? res.rows
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        setPolicies(list);
        // si aucune policy choisie, proposer la plus récente active si dispo sinon la première
        if (!policyId && list.length) {
          const active = list.find((p) => p.status === "active");
          setPolicyId(String((active || list[0]).id));
        }
      } finally {
        setPolLoading(false);
      }
    };
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDateChange = (_d, dateStr) => setDate(dateStr);
  const onWeekChange = (_d, dateStr) => setWeekStart(toMondayISO(dateStr));

  const load = async () => {
    if (!weekStart || !date || !policyId) return;
    setLoading(true);
    try {
      const res = await notify(
        api.get("/api/metrics/summary", {
          date,
          week_start: weekStart,
          policyId, // <- ID issu du select
        }),
        { loading: "Chargement…", success: "Métriques mises à jour ✅" }
      );
      setData(res || {});
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Helpers format
  const fmtInt = (v) => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n.toLocaleString("fr-FR") : "—";
  };
  const fmtPct = (v) => {
    const n = Number(v ?? 0);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(1)}%`;
  };

  // États dérivés pour badges
  const dailyPct = Number(data?.daily_available_pct ?? 0);
  const weeklyPct = Number(data?.weekly_available_pct ?? 0);
  const dayBadge = dailyPct >= 90 ? "success" : dailyPct >= 75 ? "warning" : "danger";
  const weekBadge = weeklyPct >= 90 ? "success" : weeklyPct >= 75 ? "warning" : "danger";

  // Mini résumé (mémo pour éviter re-renders inutiles)
  const summary = useMemo(
    () => [
      {
        label: "TPE observés (jour)",
        value: fmtInt(data?.tpe_day_total),
        icon: Activity,
        tone: "default",
        hint: "Nombre de TPE rapportant au moins 1 slot aujourd’hui",
      },
      {
        label: "Disponibles (jour)",
        value: fmtPct(dailyPct),
        icon: Gauge,
        tone: dayBadge,
        hint: "Part de TPE conformes à la règle sur la journée",
      },
      {
        label: "Disponibles (semaine)",
        value: fmtPct(weeklyPct),
        icon: ShieldCheck,
        tone: weekBadge,
        hint: "Part de TPE conformes à la règle sur la semaine",
      },
      {
        label: "Slots jour (OK / FAIL)",
        value: `${fmtInt(data?.slots_ok_day)} / ${fmtInt(data?.slots_fail_day)}`,
        icon: TrendingUp,
        tone: "default",
        hint: "Répartition des créneaux journaliers",
      },
    ],
    [data, dailyPct, weeklyPct, dayBadge, weekBadge]
  );

  return (
    <ComponentCard
      className="col-12"
      title="Tableau de bord — Indicateurs clés"
      desc="Synthèse du jour et de la semaine selon la règle sélectionnée."
      rightSlot={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={!date || !weekStart || !policyId || loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      }
    >
      {/* Filtres */}
      <div className="grid gap-3 md:grid-cols-5">
        <LabeledField icon={CalendarDays} label="Date">
          <DatePicker id="dash_date" placeholder="YYYY-MM-DD" onChange={onDateChange} />
        </LabeledField>

        <LabeledField icon={CalendarRange} label="Semaine (lundi)">
          <DatePicker id="dash_week" placeholder="YYYY-MM-DD" onChange={onWeekChange} />
        </LabeledField>

        {/* Select des policies (par nom) */}
        <div>
          <div className="text-xs mb-1 text-gray-500 dark:text-gray-400">Politique</div>
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            disabled={polLoading || !policies.length}
          >
            {polLoading && <option>Chargement…</option>}
            {!polLoading && !policies.length && <option>Aucune politique</option>}
            {!polLoading &&
              policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.status === "active" ? "— Actif" : "— Brouillon"}
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button onClick={load} disabled={!date || !weekStart || !policyId || loading} className="w-full">
            {loading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : null}
            Charger
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <KPIStat.Skeleton key={i} />)
          : summary.map((s, i) => <KPIStat key={i} {...s} />)}
      </div>
    </ComponentCard>
  );
}

/* ---------- Sous-composants réutilisables ---------- */

function LabeledField({ label, icon: Icon, children }) {
  return (
    <div>
      <div className="text-xs mb-1 text-gray-500 dark:text-gray-400 flex items-center gap-1">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      {children}
    </div>
  );
}

function KPIStat({ label, value, icon: Icon, tone = "default", hint }) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-700"
      : tone === "warning"
      ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-700"
      : tone === "danger"
      ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-700"
      : "bg-white dark:bg-white/[0.03] border-gray-200 dark:border-gray-800";

  const valueClasses =
    tone === "success"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "danger"
      ? "text-rose-700 dark:text-rose-300"
      : "text-gray-900 dark:text-gray-100";

  const iconTone =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-300"
      : tone === "danger"
      ? "text-rose-600 dark:text-rose-300"
      : "text-indigo-600 dark:text-indigo-300";

  return (
    <div
      className={`rounded-2xl border p-5 transition-colors ${toneClasses}`}
      title={hint || undefined}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        {Icon ? <Icon className={`h-5 w-5 ${iconTone}`} /> : null}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${valueClasses}`}>{value ?? "—"}</div>
    </div>
  );
}

KPIStat.Skeleton = function Skeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      <div className="mt-3 h-7 w-28 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
    </div>
  );
};
