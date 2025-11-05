// src/pages/availability/Daily.jsx
import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import DatePicker from "../../../components/form/date-picker";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/ui/table";
import Badge from "../../../components/ui/badge/Badge";
import { api, notify } from "../../../lib/api";
import { RefreshCw, Search, Download, AlertTriangle, Loader2 } from "lucide-react";

export default function Daily() {
  // ───────── Form
  const [date, setDate] = useState("");
  const [policyId, setPolicyId] = useState("");

  // ───────── Policies
  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  // ───────── Filtres & pagination
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all"); // all|available|unavailable (front-only)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // ───────── Data
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ───────── Loaders boutons
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
      } catch {
        /* ignore */
      } finally {
        setLoadingPolicies(false);
      }
    };
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDateChange = (_d, dateStr) => setDate(dateStr);

  // Debounce recherche (front)
  useEffect(() => {
    const t = setTimeout(() => setSearch(draftSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [draftSearch]);

  const normalizeList = (res) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
  const normalizeMeta = (res) => res?.meta ?? null;

  // ───────── Actions
  const compute = async (e) => {
    e?.preventDefault?.();
    if (!date || !policyId) return;
    setErr("");
    setComputing(true);
    try {
      await notify(
        api.post("/api/availability/daily/compute", {
          date,
          policyId: Number(policyId),
          timeout: 300_000,
        }),
        { loading: "Calcul…", success: "Jour calculé" }
      );
      await read(true); // recharge après calcul
    } finally {
      setComputing(false);
    }
  };

  const read = async (fromCompute = false) => {
    if (!date || !policyId) return;
    if (!fromCompute) setRefreshing(true);
    setLoading(true);
    setErr("");
    try {
      const res = await notify(
        api.get("/api/availability/daily", {
          date,
          policyId: Number(policyId),
          page,
          pageSize,
          search,
        }),
        { loading: "Chargement…", success: "OK" }
      );
      setRows(normalizeList(res));
      setMeta(normalizeMeta(res));
    } catch (error) {
      setErr(error?.response?.data?.message || "Impossible de charger les résultats.");
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-read quand pagination/filtre changent (si prêt)
  useEffect(() => {
    if (date && policyId) read();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search]);

  // Export CSV (après filtre local status)
  const toCSV = () => {
    if (!rows?.length) return;
    const header = ["terminal_sn", "day_ok", "slot_ok_count", "slot_fail_count", "failed_slots"];
    const lines = [header.join(";")];
    filtered.forEach((r) => {
      const vals = [
        r.terminal_sn ?? "",
        r.day_ok ? "DISPONIBLE" : "INDISPONIBLE",
        String(r.slot_ok_count ?? 0),
        String(r.slot_fail_count ?? 0),
        Array.isArray(r.failed_slots) ? r.failed_slots.join(", ") : "",
      ];
      lines.push(vals.map((v) => String(v).replace(/;/g, ",")).join(";"));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily_${date || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtres front (status)
  const filtered = useMemo(() => {
    if (status === "all") return rows;
    return rows.filter((r) => (status === "available" ? r.day_ok : !r.day_ok));
  }, [rows, status]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Tous" },
      { value: "available", label: "Disponibles" },
      { value: "unavailable", label: "Indisponibles" },
    ],
    []
  );

  const hintNeeded = !date || !policyId;

  return (
    <div className="space-y-6">
      {/* ─────────── Actions ─────────── */}
      <ComponentCard title="Suivi quotidien des TPE" desc="Calculez et consultez la disponibilité par jour.">
        {/* grille 12 avec alignement bas */}
        <form onSubmit={compute} className="grid gap-3 md:grid-cols-12 items-end">
          {/* Date */}
          <div className="md:col-span-3">
            <DatePicker
              id="daily_date"
              label="Date"
              placeholder="YYYY-MM-DD"
              onChange={onDateChange}
              /* si votre DatePicker supporte la prop suivante */
              inputClassName="h-11"
            />
          </div>

          {/* Policy */}
          <div className="md:col-span-5">
            <div className="text-xs mb-1 text-gray-500">Policy</div>
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={policyId}
              onChange={(e) => {
                setPolicyId(e.target.value);
                setPage(1);
              }}
              disabled={loadingPolicies}
            >
              <option value="" disabled>
                Choisir une policy…
              </option>
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} — {p.name || "Sans nom"}
                </option>
              ))}
            </select>
          </div>

          {/* Calculer */}
          <div className="md:col-span-2 self-end">
            <Button className="h-11 w-full" disabled={!date || !policyId || computing} aria-busy={computing ? "true" : "false"}>
              {computing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Calcul…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Calculer
                </>
              )}
            </Button>
          </div>

          {/* Actualiser */}
          <div className="md:col-span-2 self-end">
            <Button
              className="h-11 w-full"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                setPage(1);
                read();
              }}
              disabled={!date || !policyId || refreshing}
              aria-busy={refreshing ? "true" : "false"}
              title="Relire depuis l'API avec les filtres"
            >
              {refreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
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
            <span>
              Renseignez <b>la date</b> et <b>la policy</b>, puis lancez <b>Calculer</b> ou <b>Actualiser</b>.
            </span>
          </div>
        )}
      </ComponentCard>

      {/* ─────────── Résultats ─────────── */}
      <ComponentCard title="Résultats du jour">
        {/* Toolbar alignée */}
        <div className="mb-4 grid gap-3 md:grid-cols-12 items-end">
          {/* Recherche serveur */}
          <div className="md:col-span-5 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 h-11"
              placeholder="Rechercher un TPE…"
              value={draftSearch}
              onChange={(e) => {
                setDraftSearch(e.target.value);
                setPage(1);
              }}
            />          </div>

          {/* Statut (local) */}
          <div className="md:col-span-3">
            <div className="text-xs mb-1 text-gray-500">Statut (filtre local)</div>
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Page size */}
          <div className="md:col-span-2">
            <div className="text-xs mb-1 text-gray-500">Lignes / page</div>
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex gap-2">
            <Button
              className="h-11 w-full"
              variant="outline"
              onClick={() => {
                setPage(1);
                read();
              }}
              disabled={!date || !policyId || refreshing}
              title="Relire depuis l'API"
            >
              {refreshing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Appliquer
            </Button>
            {/* <Button className="h-11 w-full" variant="outline" onClick={toCSV} disabled={!filtered.length} title="Exporter la vue filtrée">
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button> */}
          </div>
        </div>

        {/* Erreur */}
        {err && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">
                    TPE
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">
                    Décision (jour)
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">
                    Slots OK
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">
                    Slots FAIL
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">
                    Créneaux en échec
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {/* Skeletons */}
                {loading && !filtered.length
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={`s-${i}`}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j} className="px-5 py-4">
                            <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : null}

                {/* Data */}
                {!loading && Array.isArray(filtered) && filtered.length > 0 ? (
                  filtered.map((r) => (
                    <TableRow key={r.terminal_sn} className="hover:bg-gray-50/60">
                      <TableCell className="px-5 py-4 text-start whitespace-nowrap">{r.terminal_sn}</TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <Badge size="sm" color={r.day_ok ? "success" : "error"}>
                          {r.day_ok ? "Disponible" : "Indisponible"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">{r.slot_ok_count}</TableCell>
                      <TableCell className="px-5 py-4 text-start">{r.slot_fail_count}</TableCell>
                      <TableCell className="px-5 py-4 text-start max-w-[600px]">
                        <span className="block truncate" title={Array.isArray(r.failed_slots) ? r.failed_slots.join(", ") : ""}>
                          {Array.isArray(r.failed_slots) ? r.failed_slots.join(", ") : ""}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : !loading ? (
                  <TableRow>
                    <TableCell className="px-5 py-8 text-center text-gray-500" colSpan={5}>
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
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
              }}
              type="button"
            >
              Précédent
            </Button>
            <div className="text-sm px-2">Page {page}</div>
            <Button
              variant="outline"
              disabled={refreshing}
              onClick={() => {
                setPage((p) => p + 1);
              }}
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
