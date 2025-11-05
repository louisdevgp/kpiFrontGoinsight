import { useEffect, useMemo, useRef, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import { api, notify } from "../../lib/api";
import { RefreshCw, Download, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

export default function RecentFailures() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState("");

  // Filtres / pagination
  const [status, setStatus] = useState("unavailable"); // défaut: montrer les KO
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce recherche
  const [draftSearch, setDraftSearch] = useState("");
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(draftSearch), 300);
    return () => clearTimeout(debounceRef.current);
  }, [draftSearch]);

  const statusOptions = [
    { value: "all", label: "Tous" },
    { value: "available", label: "Disponibles" },
    { value: "unavailable", label: "Indisponibles" },
  ];
  const pageSizeOptions = [
    { value: "25", label: "25" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  const canPrev = page > 1;
  const canNext = useMemo(() => {
    if (!meta) return rows.length === pageSize; // fallback
    // si backend renvoie pages, totalPages, hasNext...
    const total = Number(meta.total || 0);
    const totalPages = Number(meta.pages || meta.totalPages || Math.ceil(total / pageSize) || 1);
    return page < totalPages;
  }, [meta, rows.length, page, pageSize]);

  const load = async (withToast = false) => {
    setIsLoading(true);
    setErr("");
    try {
      const fetcher = api.get("/api/availability/daily", { status, search, page, pageSize });
      const res = withToast ? await notify(fetcher, { loading: "Chargement…", success: "OK" }) : await fetcher;

      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setRows(list);
      setMeta(res?.meta ?? null);
    } catch (e) {
      setRows([]);
      setMeta(null);
      setErr(e?.response?.data?.message || "Impossible de charger les données.");
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement au montage + à chaque changement de filtres/pagination (avec debounce sur search)
  useEffect(() => { load(false); /* eslint-disable-next-line */ }, [status, search, page, pageSize]);

  const refresh = () => load(true);

  const exportCSV = () => {
    if (!rows?.length) return;
    const header = ["terminal_sn", "day_status", "slot_ok_count", "slot_fail_count", "failed_slots"];
    const lines = [header.join(";")];
    rows.forEach((r) => {
      const values = [
        r.terminal_sn ?? "",
        r.day_ok ? "Disponible" : "Indispo",
        String(r.slot_ok_count ?? 0),
        String(r.slot_fail_count ?? 0),
        Array.isArray(r.failed_slots) ? r.failed_slots.join(", ") : "",
      ].map((v) => String(v).replace(/;/g, ","));
      lines.push(values.join(";"));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tpe_echecs_recents_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ComponentCard
      title="TPE en échec récent (Jour)"
      desc="Liste des terminaux observés aujourd’hui avec répartition des créneaux OK/FAIL."
      right={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      }
    >
      {/* Filtres */}
      <div className="mb-4 grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <div className="text-xs mb-1 text-gray-500">Recherche TPE</div>
          <Input placeholder="Rechercher un TPE…" value={draftSearch} onChange={(e) => { setDraftSearch(e.target.value); setPage(1); }} />
        </div>
        <div>
          <div className="text-xs mb-1 text-gray-500">Statut</div>
          <Select
            options={statusOptions}
            value={status}
            defaultValue="unavailable"
            onChange={(v) => { setStatus(v); setPage(1); }}
          />
        </div>
        <div>
          <div className="text-xs mb-1 text-gray-500">Taille page</div>
          <Select
            options={pageSizeOptions}
            value={String(pageSize)}
            defaultValue={String(pageSize)}
            onChange={(v) => { setPageSize(Number(v)); setPage(1); }}
          />
        </div>
      </div>

      {/* Alert erreur */}
      {err && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{err}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">TPE</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">Jour</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">Slots OK</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">Slots FAIL</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs">Créneaux en échec</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                // Skeleton simple
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell className="px-5 py-4"><div className="h-3 w-40 rounded bg-gray-100 dark:bg-white/10" /></TableCell>
                    <TableCell className="px-5 py-4"><div className="h-6 w-24 rounded bg-gray-100 dark:bg-white/10" /></TableCell>
                    <TableCell className="px-5 py-4"><div className="h-3 w-12 rounded bg-gray-100 dark:bg-white/10" /></TableCell>
                    <TableCell className="px-5 py-4"><div className="h-3 w-12 rounded bg-gray-100 dark:bg-white/10" /></TableCell>
                    <TableCell className="px-5 py-4"><div className="h-3 w-64 rounded bg-gray-100 dark:bg-white/10" /></TableCell>
                  </TableRow>
                ))
              ) : Array.isArray(rows) && rows.length > 0 ? (
                rows.map((r) => (
                  <TableRow key={r.terminal_sn}>
                    <TableCell className="px-5 py-4 text-start">{r.terminal_sn}</TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <div className="inline-flex items-center gap-1">
                        {r.day_ok ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <Badge size="sm" color="success">Disponible</Badge>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-rose-600" />
                            <Badge size="sm" color="error">Indispo</Badge>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">{r.slot_ok_count}</TableCell>
                    <TableCell className="px-5 py-4 text-start">{r.slot_fail_count}</TableCell>
                    <TableCell
                      className="px-5 py-4 text-start max-w-[520px] truncate"
                      title={Array.isArray(r.failed_slots) ? r.failed_slots.join(", ") : ""}
                    >
                      {Array.isArray(r.failed_slots) ? r.failed_slots.join(", ") : ""}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="px-5 py-6 text-center text-gray-500" colSpan={5}>
                    Aucun résultat
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {meta ? `Total: ${meta.total}` : ""}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!canPrev || isLoading} onClick={() => { if (!canPrev) return; setPage((p) => Math.max(1, p - 1)); }}>
            Précédent
          </Button>
          <div className="text-sm px-2">Page {page}</div>
          <Button variant="outline" disabled={!canNext || isLoading} onClick={() => { if (!canNext) return; setPage((p) => p + 1); }}>
            Suivant
          </Button>
        </div>
      </div>
    </ComponentCard>
  );
}
