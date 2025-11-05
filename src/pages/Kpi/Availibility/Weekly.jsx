// src/pages/availability/Weekly.jsx
import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import DatePicker from "../../../components/form/date-picker";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/ui/table";
import Badge from "../../../components/ui/badge/Badge";
import { api, notify } from "../../../lib/api";
import { toMondayISO } from "../../../utils/date";
import { RefreshCw, Search, Download, AlertTriangle, Loader2 } from "lucide-react";

export default function Weekly() {
  // Form
  const [weekStart, setWeekStart] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [auto, setAuto] = useState(true);
  const [recompute, setRecompute] = useState("missing"); // "missing" | "all"

  // Policies
  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  // Filtres & tri & pagination (serveur)
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState(""); // terminal_sn|days_fail|slots_ok_total|slots_fail_total
  const [order, setOrder] = useState("asc"); // asc|desc

  // Données
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Loaders boutons
  const [computing, setComputing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Init policies
  useEffect(() => {
    const loadPolicies = async () => {
      setLoadingPolicies(true);
      try {
        const res = await api.get("/api/policies");
        const list = Array.isArray(res?.data) ? res.data : [];
        setPolicies(list);
        if (!policyId && list.length) setPolicyId(String(list[0].id));
      } catch {/* ignore */}
      finally { setLoadingPolicies(false); }
    };
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onWeekChange = (_, dateStr) => setWeekStart(toMondayISO(dateStr));

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(draftSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [draftSearch]);

  const normalizeList = (res) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
  const normalizeMeta = (res) => res?.meta ?? null;

  const compute = async (e) => {
    e?.preventDefault?.();
    if (!weekStart || !policyId) return;
    setErr("");
    setComputing(true);
    try {
      await notify(
        api.post("/api/availability/weekly/compute", {
          week_start: weekStart,
          auto,
          policyId: Number(policyId),
          recompute,
          timeout: 300_000
        }),
        { loading: "Agrégation…", success: "Semaine calculée" }
      );
      await read(true);
    } finally {
      setComputing(false);
    }
  };

  const read = async (fromCompute = false) => {
    if (!weekStart || !policyId) return;
    if (!fromCompute) setRefreshing(true);
    setLoading(true);
    setErr("");
    try {
      const res = await notify(
        api.get("/api/availability/weekly", {
          week_start: weekStart,
          policyId: Number(policyId),
          search,
          status,
          page,
          pageSize,
          sortBy,
          order,
        }),
        { loading: "Chargement…", success: "OK" }
      );
      setRows(normalizeList(res));
      setMeta(normalizeMeta(res));
    } catch (err) {
      setErr(err?.response?.data?.message || "Impossible de charger les résultats.");
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-read quand filtres/pagination changent (si prêt)
  useEffect(() => {
    if (weekStart && policyId) read();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, status, sortBy, order]);

  // Tri via bouton d’en-tête
  const HeaderSortBtn = ({ label, field }) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 underline decoration-dotted text-gray-600 dark:text-gray-300"
      onClick={() => {
        if (sortBy === field) setOrder((o) => (o === "asc" ? "desc" : "asc"));
        else { setSortBy(field); setOrder("asc"); }
        setPage(1);
      }}
      title="Trier"
    >
      {label} {sortBy === field ? (order === "asc" ? "↑" : "↓") : ""}
    </button>
  );

  // Export CSV
  const toCSV = () => {
    if (!rows?.length) return;
    const header = ["terminal_sn","decision","days_ok","days_fail","fail_dates","slots_ok_total","slots_fail_total"];
    const lines = [header.join(";")];
    rows.forEach((r) => {
      const vals = [
        r.terminal_sn ?? "",
        r.decision ?? "",
        String(r.days_ok ?? 0),
        String(r.days_fail ?? 0),
        Array.isArray(r.fail_dates) ? r.fail_dates.join(", ") : "",
        String(r.slots_ok_total ?? 0),
        String(r.slots_fail_total ?? 0),
      ];
      lines.push(vals.map((v) => String(v).replace(/;/g, ",")).join(";"));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `weekly_${weekStart || "export"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Tous" },
      { value: "available", label: "Disponibles" },
      { value: "unavailable", label: "Indisponibles" },
    ],
    []
  );

  const hintNeeded = !weekStart || !policyId;

  return (
    <div className="space-y-6">
      {/* ─────────── Actions ─────────── */}
      <ComponentCard title="Bilan hebdomadaire des TPE" desc="Agrégez les résultats de la semaine selon la policy choisie.">
        {/* Alignement uniforme en 12 colonnes */}
        <form onSubmit={compute} className="grid gap-3 md:grid-cols-12 items-end">
          {/* Semaine (lundi) */}
          <div className="md:col-span-3">
            <DatePicker
              id="weekly_week"
              label="Début de semaine (lundi)"
              placeholder="YYYY-MM-DD"
              onChange={onWeekChange}
              inputClassName="h-11"
            />
          </div>

          {/* Policy */}
          <div className="md:col-span-4">
            <div className="text-xs mb-1 text-gray-500">Policy</div>
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={policyId}
              onChange={(e) => { setPolicyId(e.target.value); setPage(1); }}
              disabled={loadingPolicies}
            >
              <option value="" disabled>Choisir une policy…</option>
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} — {p.name || "Sans nom"}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-compute missing days */}
          {/* <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
              Calcul auto des jours manquants
            </label>
          </div>

          {/* Recompute mode */}
          {/* <div className="md:col-span-2">
            <div className="text-xs mb-1 text-gray-500">Recompute</div>
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={recompute}
              onChange={(e) => setRecompute(e.target.value)}
            >
              <option value="missing">Manquants seulement</option>
              <option value="all">Tout recalculer</option>
            </select>
          </div> */}

          {/* Calculer */}
          <div className="md:col-span-1">
            <Button className="h-11 w-full" disabled={!weekStart || !policyId || computing} aria-busy={computing ? "true" : "false"}>
              {computing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Calcul…
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-6 mr-1" />
                  Calculer
                </>
              )}
            </Button>
          </div>

          {/* Actualiser */}
          <div className="md:col-span-1">
            <Button
              className="h-11 w-full"
              variant="outline"
              onClick={(e) => { e.preventDefault(); setPage(1); read(); }}
              disabled={!weekStart || !policyId || refreshing}
              aria-busy={refreshing ? "true" : "false"}
            >
              {refreshing ? (
                <>
                  <Loader2 className="h-5 w-6 mr-1 animate-spin" />
                  Actualisation…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Actualiser
                </>
              )}
            </Button>
          </div>
        </form>

        {hintNeeded && (
          <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Renseignez <b>le lundi de semaine</b> et <b>la policy</b>, puis cliquez sur <b>Calculer</b> ou <b>Actualiser</b>.</span>
          </div>
        )}
      </ComponentCard>

      {/* ─────────── Résultats ─────────── */}
      <ComponentCard title="Résultats de la semaine">
        {/* Toolbar filtres alignée */}
        <div className="mb-4 grid gap-3 md:grid-cols-12 items-end">
          {/* Recherche */}
          <div className="md:col-span-5 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un TPE…"
              value={draftSearch}
              onChange={(e) => { setDraftSearch(e.target.value); setPage(1); }}
              className="pl-9 h-11"
            />
          </div>

          {/* Statut */}
          <div className="md:col-span-3">
            <div className="text-xs mb-1 text-gray-500">Statut</div>
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Page size */}
          <div className="md:col-span-2">
            <div className="text-xs mb-1 text-gray-500">Lignes / page</div>
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {[25,50,100,200].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex gap-2">
            <Button
              className="h-11 w-full"
              variant="outline"
              onClick={() => { setPage(1); read(); }}
              disabled={!weekStart || !policyId || refreshing}
            >
              {refreshing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Appliquer
            </Button>
            {/* <Button className="h-11 w-full" variant="outline" onClick={toCSV} disabled={!rows.length}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button> */}
          </div>
        </div>

        {/* Erreur */}
        {err && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">
                    <HeaderSortBtn label="TPE" field="terminal_sn" />
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">Décision</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">Jours OK</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">
                    <HeaderSortBtn label="Jours FAIL" field="days_fail" />
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">Dates en échec</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">
                    <HeaderSortBtn label="Slots OK" field="slots_ok_total" />
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">
                    <HeaderSortBtn label="Slots FAIL" field="slots_fail_total" />
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {loading && !rows.length
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={`s-${i}`}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j} className="px-5 py-4">
                            <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : null}

                {!loading && Array.isArray(rows) && rows.length > 0 ? (
                  rows.map((r) => (
                    <TableRow key={r.terminal_sn} className="hover:bg-gray-50/60">
                      <TableCell className="px-5 py-4 text-start whitespace-nowrap">{r.terminal_sn}</TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <Badge size="sm" color={r.decision === "DISPONIBLE" ? "success" : "error"}>
                          {r.decision === "DISPONIBLE" ? "Disponible" : "Indisponible"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">{r.days_ok}</TableCell>
                      <TableCell className="px-5 py-4 text-start">{r.days_fail}</TableCell>
                      <TableCell className="px-5 py-4 text-start max-w-[600px]">
                        <span
                          className="block truncate"
                          title={Array.isArray(r.fail_dates) ? r.fail_dates.join(", ") : ""}
                        >
                          {Array.isArray(r.fail_dates) ? r.fail_dates.join(", ") : ""}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">{r.slots_ok_total}</TableCell>
                      <TableCell className="px-5 py-4 text-start">{r.slots_fail_total}</TableCell>
                    </TableRow>
                  ))
                ) : !loading ? (
                  <TableRow>
                    <TableCell className="px-5 py-8 text-center text-gray-500" colSpan={7}>
                      {Array.isArray(rows) ? "Aucun résultat" : "Chargement…"}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">{meta ? `Total : ${meta.total}` : ""}</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || refreshing}
              onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
              type="button"
            >
              Précédent
            </Button>
            <div className="text-sm px-2">Page {page}</div>
            <Button
              variant="outline"
              disabled={refreshing}
              onClick={() => { setPage((p) => p + 1); }}
              type="button"
            >
              Suivant
            </Button>
          </div>
        </div>
      </ComponentCard>
    </div>
  );
}
