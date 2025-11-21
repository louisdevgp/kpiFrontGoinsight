import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import DatePicker from "../../components/form/date-picker";
import Button from "../../components/ui/button/Button";
import PolicySelect from "../../components/policiy/PolicySelect";
import { api, notify } from "../../lib/api";
import { toMondayISO } from "../../utils/date";
import { RefreshCw, CalendarDays, CalendarRange, Activity, Gauge, ShieldCheck, AlertTriangle } from "lucide-react";


/* Utils */
function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Champ date robuste (DatePicker + fallback input natif) */
function DateField({ label, value, onChange, id = "date" }) {
  return (
    <div>
      <div className="text-xs mb-1 text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <CalendarDays className="h-3.5 w-3.5" /> {label}
      </div>
      <DatePicker id={id} placeholder="YYYY-MM-DD" onChange={(_, s) => onChange(s)} />
      <input
        type="date"
        className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Champ lundi de semaine (normalise en lundi ISO) */
function WeekField({ label, value, onChange, id = "week" }) {
  return (
    <div>
      <div className="text-xs mb-1 text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <CalendarRange className="h-3.5 w-3.5" /> {label}
      </div>
      <DatePicker id={id} placeholder="YYYY-MM-DD" onChange={(_, s) => onChange(toMondayISO(s))} />
      <input
        type="date"
        className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        value={value || ""}
        onChange={(e) => onChange(toMondayISO(e.target.value))}
      />
    </div>
  );
}

/* KPI Card */
function KPI({ label, value, icon: Icon, tone = "default", hint }) {
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
    <div className={`rounded-2xl border p-5 transition-colors ${toneClasses}`} title={hint || undefined}>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        {Icon ? <Icon className={`h-5 w-5 ${iconTone}`} /> : null}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${valueClasses}`}>{value ?? "—"}</div>
    </div>
  );
}

export default function AvailabilityMetrics() {
  const [date, setDate] = useState(yesterdayISO()); // veille par défaut
  const [weekStart, setWeekStart] = useState(toMondayISO(yesterdayISO()));
  const [policyId, setPolicyId] = useState(""); // via PolicySelect

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fmtInt = (v) => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n.toLocaleString("fr-FR") : "—";
  };
  const fmtPct = (v) => {
    const n = Number(v ?? 0);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(1)}%`;
  };

  const indispoDay = useMemo(() => {
    const total = Number(data?.tpe_day_total ?? 0);
    const ok = Number(data?.tpe_day_ok ?? 0);
    if (!Number.isFinite(total) || !Number.isFinite(ok)) return "—";
    return fmtInt(Math.max(0, total - ok));
  }, [data]);

  const load = async () => {
    if (!date || !weekStart || !policyId) return;
    setLoading(true);
    try {
      // ✅ 1) corrige l’URL
      // ✅ 2) on ne garde que res.data (le payload), pas l’objet entier
      const res = await notify(
        api.get("/api/metrics/metrics/summary/latest", { policyId: Number(policyId) }),
        { loading: "Chargement…", success: "Métriques mises à jour ✅" }
      );
      setData(res?.data ?? null);
    } catch (_) {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Chargement auto si tout est renseigné
  useEffect(() => {
    if (policyId && date && weekStart) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId, date, weekStart]);

  // Tones pour badges jour / semaine
  const dailyPct = Number(data?.daily_available_pct ?? 0);
  const weeklyPct = Number(data?.weekly_available_pct ?? 0);
  const dayTone = dailyPct >= 40 ? "success" : dailyPct >= 10 ? "warning" : "danger";
  const weekTone = weeklyPct >= 40 ? "success" : weeklyPct >= 10 ? "warning" : "danger";

  return (
    <ComponentCard
      title="Tableau de bord — Indicateurs clés"
      desc="Données de la veille et de la semaine en cours, selon la règle sélectionnée."
    >
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {!date || !weekStart || !policyId ? (
          <div className="w-full md:w-auto flex items-center gap-2 text-xs rounded-lg border border-dashed border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 px-3 py-2">
            <AlertTriangle className="h-4 w-4" />
            Renseignez <b>la date</b>, <b>le lundi de semaine</b> et <b>la règle</b>, puis cliquez sur <b>Actualiser</b>.
          </div>
        ) : null}
        <Button variant="outline" onClick={load} disabled={!date || !weekStart || !policyId || loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Filtres */}
      <div className="grid gap-3 md:grid-cols-5">
        <DateField id="dash_date" label="Date (veille par défaut)" value={date} onChange={setDate} />
        <WeekField id="dash_week" label="Semaine (lundi)" value={weekStart} onChange={setWeekStart} />
        <div className="md:col-span-2">
          <div className="text-xs mb-1 text-gray-500 dark:text-gray-400">Règle de disponibilité</div>
          <PolicySelect value={policyId} onChange={setPolicyId} />
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI
          label="TPE observés (jour)"
          value={fmtInt(data?.tpe_day_total)}
          icon={Activity}
          hint="Nombre de TPE rapportant au moins 1 slot pour la date sélectionnée"
        />
        <KPI
          label="TPE disponibles (jour)"
          value={fmtInt(data?.tpe_day_ok)}
          icon={Gauge}
          tone="success"
          hint="Conformes à la policy choisie sur la journée"
        />
        <KPI
          label="TPE indisponibles (jour)"
          value={indispoDay}
          icon={AlertTriangle}
          tone={dailyPct < 75 ? "danger" : "warning"}
          hint="Total observés - disponibles"
        />
        <KPI
          label="Taux disponibilité (jour)"
          value={fmtPct(data?.daily_available_pct)}
          icon={ShieldCheck}
          tone={dayTone}
          hint="(TPE disponibles / TPE observés) × 100"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <KPI
          label="Taux disponibilité (semaine)"
          value={fmtPct(data?.weekly_available_pct)}
          icon={ShieldCheck}
          tone={weekTone}
          hint="Selon la règle et le lundi sélectionnés"
        />
        <KPI
          label="TPE observés (semaine)"
          value={fmtInt(data?.tpe_week_total)}
          icon={Activity}
          hint="Population hebdomadaire observée"
        />
      </div>
    </ComponentCard>
  );
}
