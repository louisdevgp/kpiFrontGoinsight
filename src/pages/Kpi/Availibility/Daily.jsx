import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../../components/common/ComponentCard";
import DatePicker from "../../../components/form/date-picker";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import PolicySelect from "../../../components/policiy/PolicySelect";
import { api, notify, download } from "../../../lib/api";
import { toMondayISO } from "../../../utils/date";
import { CalendarDays, RefreshCw, Calculator, Download } from "lucide-react";
import PageMeta from "../../../components/common/PageMeta";

/* ====== Utilitaires ====== */
function toISO(d) {
  if (!d) return "";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function ReasonChip({ r }) {
  const map = {
    OFFLINE_DURATION: "Hors-ligne prolongé",
    STATUS_INACTIVE: "Statut inactif",
    SIGNAL_LOW: "Signal faible",
    GEOFENCE_OUT: "Hors geofence",
    BATTERY_LOW: "Batterie faible",
    PAPER_OUT: "Plus de papier",
    PAPER_UNKNOWN: "État papier inconnu",
    PAPER_UNKNOWN_WARN: "Papier incertain",
    NO_DATA: "Pas de données",
  };

  return (
    <div className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
      {map[r] || r}
    </div>
  );
}

/** Champ date robuste (DatePicker + input natif) */
function DateField({ label, value, onChange, id = "date" }) {
  return (
    <div>
      <div className="text-xs mb-1 text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <CalendarDays className="h-3.5 w-3.5" /> {label}
      </div>
      <DatePicker
        id={id}
        placeholder="YYYY-MM-DD"
        onChange={(_, s) => onChange(toISO(s))}
      />
      <input
        type="date"
        className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        value={value || ""}
        onChange={(e) => onChange(toISO(e.target.value))}
      />
    </div>
  );
}

/* KPI Card */
function KPI({ label, value, tone = "default" }) {
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

  return (
    <div className={`rounded-2xl border p-5 transition-colors ${toneClasses}`}>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${valueClasses}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function Daily() {
  const [date, setDate] = useState(yesterdayISO()); // veille par défaut
  const [policyId, setPolicyId] = useState("");
  const [computing, setComputing] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all"); // all | available | unavailable
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const [total, setTotal] = useState(0);

  // KPIs (provenant de meta/summary back)
  const [availableCount, setAvailableCount] = useState(0);
  const [unavailableCount, setUnavailableCount] = useState(0);

  const compute = async () => {
    if (!date || !policyId) return;
    const week_start = toMondayISO(date);
    setComputing(true);
    try {
      await notify(
        api.post("/api/availability/daily/compute", {
          date,
          week_start,
          // 🔁 aligné avec le back : on envoie policyId
          policyId: policyId,
        }),
        { loading: "Calcul quotidien…", success: "Calcul quotidien terminé ✅" }
      );
      await load(); // recharge
    } finally {
      setComputing(false);
    }
  };

  async function exportDaily() {
    if (!date || !policyId) return;
    await notify(
      download("/api/export/daily/export", {
        date,
        // 🔁 idem : policyId
        policyId: policyId,
        week_start: toMondayISO(date),
        auto: 1,
      }),
      { loading: "Export en cours…", success: "Téléchargement lancé ✅" }
    );
  }

  const load = async () => {
    if (!date || !policyId) return;
    setLoading(true);
    try {
      const res = await notify(
        api.get("/api/availability/daily", {
          date,
          // 🔁 idem : policyId
          policyId: policyId,
          page,
          pageSize,
          search,
          status, // << filtré côté back
        }),
        { loading: "Chargement…", success: "Données à jour ✅" }
      );
      const data = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
      const meta = res?.meta || res?.data?.meta || {};
      const summary = res?.summary || res?.data?.summary || {};

      setRows(data);
      setTotal(Number(meta.total ?? data.length));
      setAvailableCount(
        Number(meta.available_count ?? summary.available_count ?? 0)
      );
      setUnavailableCount(
        Number(meta.unavailable_count ?? summary.unavailable_count ?? 0)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (policyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId, date, page, pageSize, search, status]);

  const availabilityPct = useMemo(() => {
    const tot = Number(total || 0);
    return tot ? `${((availableCount / tot) * 100).toFixed(1)}%` : "—";
  }, [availableCount, total]);

  const tableRows = rows;

  return (
    <>
      <PageMeta
        title="Disponibilité TPE — Quotidienne"
        description="Vue d’ensemble des indicateurs de disponibilité TPE (jour/semaine)"
      />
    <ComponentCard
      title="Disponibilité — Quotidienne"
      desc="Calcul et consultation quotidienne par règle."
    >
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={compute}
          disabled={!date || !policyId || computing}
        >
          <Calculator
            className={`h-4 w-4 mr-1 ${computing ? "animate-spin" : ""}`}
          />
          {computing ? "Calcul en cours…" : "Calculer la journée"}
        </Button>
        <Button
          variant="outline"
          onClick={load}
          disabled={!date || !policyId || loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
          />
          Actualiser
        </Button>
        <Button
          variant="outline"
          onClick={exportDaily}
          disabled={!date || !policyId}
        >
          <Download className="h-4 w-4 mr-1" />
          Export CSV (avec raisons)
        </Button>
      </div>

      {/* Filtres */}
      <div className="mb-4 grid gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <DateField
            label="Date"
            value={date}
            onChange={(v) => {
              setPage(1);
              setDate(v);
            }}
            id="daily_date"
          />
        </div>

        <div className="md:col-span-4">
          <div className="text-xs mb-1 text-gray-500 dark:text-gray-400">
            Règle de disponibilité
          </div>
          <PolicySelect
            value={policyId}
            onChange={(v) => {
              setPage(1);
              setPolicyId(v);
            }}
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs mb-1 text-gray-500">Recherche (SN)</div>
          <Input
            placeholder="Filtrer par numéro de série…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>

        <div className="md:col-span-3">
          <div className="text-xs mb-1 text-gray-500">Statut</div>
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="all">Tous</option>
            <option value="available">Disponibles</option>
            <option value="unavailable">Indisponibles</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <KPI label="Total TPE (jour)" value={total} />
        <KPI label="Disponibles (jour)" value={availableCount} tone="success" />
        <KPI
          label="Indisponibles (jour)"
          value={unavailableCount}
          tone="danger"
        />
        <KPI
          label="Taux disponibilité (jour)"
          value={availabilityPct}
          tone={
            total
              ? availableCount / total >= 0.4
                ? "success"
                : availableCount / total >= 0.1
                ? "warning"
                : "danger"
              : "default"
          }
        />
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Jour concerné par le calcul quotidien"
                >
                  Date (jour)
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Numéro de série du terminal"
                >
                  Numéro de série
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Décision du jour (Disponible / Indisponible)"
                >
                  Statut du jour
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Nombre de créneaux horaires conformes"
                >
                  Créneaux OK
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Nombre de créneaux horaires non conformes"
                >
                  Créneaux NOK
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Liste des créneaux horaires non conformes"
                >
                  Détails créneaux NOK
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Raisons de non-conformité (batterie, signal, géofence, etc.)"
                >
                  Raisons d’indisponibilité
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {tableRows.map((r, idx) => {
                const label = r.day_ok ? "DISPONIBLE" : "INDISPONIBLE";
                const tone = r.day_ok
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700";
                const slots = Array.isArray(r.failed_slots)
                  ? r.failed_slots.join(", ")
                  : "";
                return (
                  <tr key={idx}>
                    <td className="px-5 py-3 whitespace-nowrap">{r.date}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {r.terminal_sn}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${tone}`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {r.slot_ok_count}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {r.slot_fail_count}
                    </td>
                    <td
                      className="px-5 py-3 max-w-[320px] truncate"
                      title={slots}
                    >
                      {slots}
                    </td>
                    <td className="px-5 py-3 max-w-[360px]">
                      <div className="flex flex-wrap gap-1">
                        {(r.failed_reasons || []).map((reason, i) => (
                          <ReasonChip key={i} r={reason} />
                        ))}
                        {(!r.failed_reasons ||
                          r.failed_reasons.length === 0) && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!tableRows.length && (
                <tr>
                  <td
                    className="px-5 py-5 text-center text-gray-500"
                    colSpan={9}
                  >
                    {loading ? "Chargement…" : "Aucune donnée"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
          <div className="text-gray-500">
            Total :{" "}
            <span className="font-medium text-gray-800 dark:text-white">
              {total}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
            >
              {[50, 100, 200, 500, 1000].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </Button>
            <span className="text-gray-600">
              Page <span className="font-medium">{page}</span>
            </span>
            <Button
              variant="outline"
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>
    </ComponentCard>
  </>);
}
