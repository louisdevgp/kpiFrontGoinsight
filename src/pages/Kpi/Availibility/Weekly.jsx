// src/pages/availability/Weekly.jsx
import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../../components/common/ComponentCard";
import DatePicker from "../../../components/form/date-picker";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import PolicySelect from "../../../components/policiy/PolicySelect";
import { api, notify, download } from "../../../lib/api";
import { toMondayISO } from "../../../utils/date";
import { CalendarRange, RefreshCw, FileDown, Calculator } from "lucide-react";
import PageMeta from "../../../components/common/PageMeta";

/** DateField pour la semaine (lundi) */
function WeekField({ label, value, onChange, id = "week" }) {
  return (
    <div>
      <div className="text-xs mb-1 text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <CalendarRange className="h-3.5 w-3.5" /> {label}
      </div>
      <DatePicker
        id={id}
        placeholder="YYYY-MM-DD"
        onChange={(_, s) => onChange(toMondayISO(s))}
      />
      <input
        type="date"
        className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        value={value || ""}
        onChange={(e) => onChange(toMondayISO(e.target.value))}
      />
    </div>
  );
}

function currentMondayISO() {
  return toMondayISO(new Date().toISOString().slice(0, 10));
}

/* ------- Helpers d'affichage (dates sans T/Z) ------- */
function toDateObj(v) {
  if (!v) return null;
  try {
    return v instanceof Date ? v : new Date(v);
  } catch {
    return null;
  }
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatDate(v) {
  const d = toDateObj(v);
  if (!d || isNaN(d.getTime())) return String(v ?? "");
  const y = d.getFullYear(),
    m = pad2(d.getMonth() + 1),
    day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}
function formatDateTime(v) {
  const d = toDateObj(v);
  if (!d || isNaN(d.getTime())) return String(v ?? "");
  const y = d.getFullYear(),
    m = pad2(d.getMonth() + 1),
    day = pad2(d.getDate());
  const hh = pad2(d.getHours()),
    mm = pad2(d.getMinutes());
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

/* KPI Card simple */
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
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${valueClasses}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function Weekly() {
  const [weekStart, setWeekStart] = useState(currentMondayISO());
  const [policyId, setPolicyId] = useState("");
  const [computing, setComputing] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all"); // all | available | unavailable  (passe au back)
  const [sortBy, setSortBy] = useState(""); // '', 'days_fail', 'slots_fail_total', 'slots_ok_total'
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);

  // KPI aggregés renvoyés par le back (meta)
  const [availableCount, setAvailableCount] = useState(0);
  const [unavailableCount, setUnavailableCount] = useState(0);

  const compute = async () => {
    if (!weekStart || !policyId) return;
    setComputing(true);
    try {
      await notify(
        api.post("/api/availability/weekly/compute", {
          week_start: weekStart,
          policyId,
          auto: true,
        }),
        {
          loading: "Calcul hebdomadaire…",
          success: "Calcul hebdomadaire terminé ✅",
        }
      );
      await load();
    } finally {
      setComputing(false);
    }
  };

  const load = async () => {
    if (!weekStart || !policyId) return;
    setLoading(true);
    try {
      const res = await notify(
        api.get("/api/availability/weekly", {
          week_start: weekStart,
          policyId,
          page,
          pageSize,
          search,
          status, // << passe au back
          sortBy,
          order,
        }),
        { loading: "Chargement…", success: "Données à jour ✅" }
      );
      const data = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
      const meta = res?.meta || res?.data?.meta || {};

      setRows(data);
      setTotal(Number(meta.total ?? data.length));
      setAvailableCount(Number(meta.available_count ?? 0));
      setUnavailableCount(Number(meta.unavailable_count ?? 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (policyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId, weekStart, page, pageSize, search, status, sortBy, order]);

  const taux = total ? (availableCount / total) * 100 : 0;
  const tauxTone = taux >= 40 ? "success" : taux >= 10 ? "warning" : "danger";

  async function exportWeekly() {
    if (!weekStart || !policyId) return;
    await notify(
      download("/api/export/weekly/export", {
        week_start: weekStart,
        policyId,
        auto: 1,
      }),
      { loading: "Export en cours…", success: "Téléchargement lancé ✅" }
    );
  }

  const tableRows = rows;

  return (
        <>
          <PageMeta
            title="Disponibilité TPE — Hebdomadaire"
            description="Vue d’ensemble des indicateurs de disponibilité TPE (jour/semaine)"
          />
    <ComponentCard
      title="Disponibilité — Hebdomadaire"
      desc="Calcul et consultation hebdomadaire par règle."
    >
      {/* Toolbar d’actions */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={compute}
          disabled={!weekStart || !policyId || computing}
>
          <Calculator
            className={`h-4 w-4 mr-1 ${computing ? "animate-spin" : ""}`}
          />{" "}
          Calculer la semaine
        </Button>
        <Button
          variant="outline"
          onClick={exportWeekly}
          disabled={!weekStart || !policyId}
        >
          <FileDown className="h-4 w-4 mr-1" /> Export CSV (avec raisons)
        </Button>
        <Button
          variant="outline"
          onClick={load}
          disabled={!weekStart || !policyId || loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
          />
          Actualiser
        </Button>
      </div>

      {/* Filtres */}
      <div className="mb-4 grid gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <WeekField
            label="Semaine (lundi)"
            value={weekStart}
            onChange={(v) => {
              setPage(1);
              setWeekStart(v);
            }}
            id="week_start"
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

        <div className="md:col-span-3 grid grid-cols-3 gap-2">
          <div>
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
          <div>
            <div className="text-xs mb-1 text-gray-500">Trier par</div>
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={sortBy}
              onChange={(e) => {
                setPage(1);
                setSortBy(e.target.value);
              }}
            >
              <option value="">—</option>
              <option value="days_fail">Jours KO</option>
              <option value="slots_fail_total">Slots KO</option>
              <option value="slots_ok_total">Slots OK</option>
            </select>
          </div>
          <div>
            <div className="text-xs mb-1 text-gray-500">Ordre</div>
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={order}
              onChange={(e) => {
                setPage(1);
                setOrder(e.target.value);
              }}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <KPI label="Total TPE" value={fmtInt(total)} />
        <KPI
          label="Disponibles (semaine)"
          value={fmtInt(availableCount)}
          tone="success"
        />
        <KPI
          label="Indisponibles (semaine)"
          value={fmtInt(unavailableCount)}
          tone="danger"
        />
        <KPI
          label="Taux disponibilité"
          value={total ? `${taux.toFixed(1)}%` : "—"}
          tone={tauxTone}
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
                  title="Premier jour de la semaine (lundi)"
                >
                  Semaine (lundi)
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Numéro de série du terminal"
                >
                  Numéro de série
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Identifiant de la règle de disponibilité"
                >
                  Règle
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Décision hebdomadaire (Disponible / Indisponible)"
                >
                  Décision
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Nombre de jours conformes dans la semaine"
                >
                  Jours conformes
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Nombre de jours non conformes dans la semaine"
                >
                  Jours non conformes
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Total des créneaux horaires conformes"
                >
                  Créneaux OK
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Total des créneaux horaires non conformes"
                >
                  Créneaux NOK
                </th>
                <th
                  className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap"
                  title="Liste des dates/heures non conformes"
                >
                  Dates non conformes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {tableRows.map((r, idx) => {
                const failDatesArr = Array.isArray(r.fail_dates)
                  ? r.fail_dates
                  : [];
                const failDatesPretty = failDatesArr
                  .map(formatDateTime)
                  .join(", ");
                const failDatesRaw = failDatesArr.join(", ");
                const isAvailable =
                  String(r.decision).toUpperCase() === "DISPONIBLE" ||
                  Number(r.decision) === 1;
                const label = isAvailable ? "DISPONIBLE" : "INDISPONIBLE";
                const tone = isAvailable
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700";
                return (
                  <tr key={idx}>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {formatDate(r.week_start)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {r.terminal_sn}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {r.policyId}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${tone}`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {r.days_ok}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {r.days_fail}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {r.slots_ok_total}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {r.slots_fail_total}
                    </td>
                    <td
                      className="px-5 py-3 max-w-[420px] truncate"
                      title={failDatesRaw}
                    >
                      {failDatesPretty || "—"}
                    </td>
                  </tr>
                );
              })}
              {!tableRows.length && (
                <tr>
                  <td
                    className="px-5 py-5 text-center text-gray-500"
                    colSpan={9} // ✅ 9 colonnes visibles dans le thead
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
              {fmtInt(total)}
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
    </>
  );
}

function fmtInt(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("fr-FR") : "—";
}
