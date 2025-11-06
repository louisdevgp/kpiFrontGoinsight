import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import { notify } from "../../../lib/api";
import {
  listPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
} from "../../../services/policies";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  FileCog,
  BatteryCharging,
  Wifi,
  Printer,
  MapPin,
  FileText,
} from "lucide-react";

const DEFAULT_SLOTS = [12, 13, 14, 15, 17, 18, 19];
const DEFAULT_FORM = {
  name: "",
  battery_min_pct: 20,
  daily_fail_N: 1,
  weekly_fail_days: 1,
  weekly_fail_slots: 6,
  slot_hours_json: DEFAULT_SLOTS,
  paper_mode: "strict",
  use_internet: 1,
  use_tpe_on: 1,
  use_geofence: 1,
  use_battery: 1,
  use_printer: 1,
  use_paper: 1,
  status: "active",
};

function StatusBadge({ s }) {
  const isActive = s === "active";
  const isDraft = s === "draft";
  const cls = isActive
    ? "bg-blue-100 text-blue-700"
    : isDraft
    ? "bg-gray-100 text-gray-700"
    : "bg-purple-100 text-purple-700";
  const label = isActive ? "Actif" : isDraft ? "Brouillon" : "Archivé";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

function FlagChip({ on = 0, label, icon: Icon }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${
      on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500"
    }`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  );
}

function LoaderInline({ spinning, children }) {
  return (
    <span className="inline-flex items-center gap-2">
      {spinning ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
      {children}
    </span>
  );
}

/* ------------------ MODAL ------------------ */
function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function PolicyModal({ open, onClose, initial, onSave }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(initial || DEFAULT_FORM);
  const [slotHoursStr, setSlotHoursStr] = useState(
    Array.isArray(initial?.slot_hours_json) ? initial.slot_hours_json.join(",") : DEFAULT_FORM.slot_hours_json.join(",")
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...DEFAULT_FORM, ...initial } : { ...DEFAULT_FORM });
      setSlotHoursStr(Array.isArray(initial?.slot_hours_json) ? initial.slot_hours_json.join(",") : DEFAULT_SLOTS.join(","));
    }
  }, [open, initial]);

  const setNum = (key) => (e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }));
  const setStr = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggle = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked ? 1 : 0 }));

  const parsedSlots = useMemo(() => {
    const nums = slotHoursStr.split(",").map((s) => s.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
    const clean = Array.from(new Set(nums.map((n) => Math.round(n)).filter((n) => n >= 0 && n <= 23))).sort((a, b) => a - b);
    return clean.length ? clean : [];
  }, [slotHoursStr]);

  const errors = useMemo(() => {
    const e = {};
    if (!form.name?.trim()) e.name = "Le nom de la règle est requis.";
    if (!Number.isFinite(form.battery_min_pct) || form.battery_min_pct < 0 || form.battery_min_pct > 100) {
      e.battery_min_pct = "Le seuil batterie doit être entre 0 et 100.";
    }
    ["daily_fail_N", "weekly_fail_days", "weekly_fail_slots"].forEach((k) => {
      const v = form[k];
      if (!Number.isFinite(v) || v < 0) e[k] = "Doit être un nombre ≥ 0.";
    });
    if (!parsedSlots.length) e.slot_hours_json = "Ajoutez au moins un créneau (heures 0–23).";
    if (!["strict", "lenient"].includes(String(form.paper_mode))) e.paper_mode = "Mode papier invalide.";
    return e;
  }, [form, parsedSlots]);

  const canSubmit = Object.keys(errors).length === 0;

  const save = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        status: "active",
        slot_hours_json: parsedSlots.length ? parsedSlots : DEFAULT_SLOTS,
        use_internet: form.use_internet ? 1 : 0,
        use_tpe_on: form.use_tpe_on ? 1 : 0,
        use_geofence: form.use_geofence ? 1 : 0,
        use_battery: form.use_battery ? 1 : 0,
        use_printer: form.use_printer ? 1 : 0,
        use_paper: form.use_paper ? 1 : 0,
      };
      await onSave(payload, isEdit ? initial.id : undefined);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/50 p-3">
        <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.06] dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div className="flex items-center gap-2">
              <FileCog className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              <div>
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Modifier la règle de disponibilité" : "Créer une règle de disponibilité"}
                </h3>
                <p className="text-xs text-gray-500">Statut forcé à <b>Actif</b> — champ masqué.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"
              aria-label="Fermer"
              title="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={save} className="px-6 pb-6">
            <div className="mt-5 grid gap-6">
              {/* Nom */}
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-10">
                  <div className="text-xs mb-1 text-gray-500">Nom de la règle</div>
                  <Input placeholder="Ex: Semaine 44 — Standard" value={form.name} onChange={setStr("name")} />
                  {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                </div>
                <div className="md:col-span-2 flex items-end justify-end">
                  <StatusBadge s="active" />
                </div>
              </div>

              {/* Seuils */}
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-3">
                  <div className="text-xs mb-1 text-gray-500">Seuil batt. (%)</div>
                  <Input type="number" min="0" max="100" value={form.battery_min_pct} onChange={setNum("battery_min_pct")} />
                  {errors.battery_min_pct && <p className="mt-1 text-xs text-red-600">{errors.battery_min_pct}</p>}
                </div>
                <div className="md:col-span-3">
                  <div className="text-xs mb-1 text-gray-500">Échecs/jour</div>
                  <Input type="number" min="0" value={form.daily_fail_N} onChange={setNum("daily_fail_N")} />
                  {errors.daily_fail_N && <p className="mt-1 text-xs text-red-600">{errors.daily_fail_N}</p>}
                </div>
                <div className="md:col-span-3">
                  <div className="text-xs mb-1 text-gray-500">Jours KO/sem</div>
                  <Input type="number" min="0" value={form.weekly_fail_days} onChange={setNum("weekly_fail_days")} />
                  {errors.weekly_fail_days && <p className="mt-1 text-xs text-red-600">{errors.weekly_fail_days}</p>}
                </div>
                <div className="md:col-span-3">
                  <div className="text-xs mb-1 text-gray-500">Créneaux KO/sem</div>
                  <Input type="number" min="0" value={form.weekly_fail_slots} onChange={setNum("weekly_fail_slots")} />
                  {errors.weekly_fail_slots && <p className="mt-1 text-xs text-red-600">{errors.weekly_fail_slots}</p>}
                </div>
              </div>

              {/* Créneaux */}
              <div>
                <div className="text-xs mb-1 text-gray-500">Créneaux (heures séparées par des virgules)</div>
                <Input placeholder="Ex: 8,9,12,13,14,17,18" value={slotHoursStr} onChange={(e) => setSlotHoursStr(e.target.value)} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {parsedSlots.map((h) => (
                    <button
                      key={h}
                      type="button"
                      title="Retirer ce créneau"
                      onClick={() => setSlotHoursStr(parsedSlots.filter((x) => x !== h).join(","))}
                      className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      {h}h ✕
                    </button>
                  ))}
                  {!parsedSlots.length && <span className="text-xs text-gray-500">Aucun créneau valide</span>}
                </div>
                {errors.slot_hours_json && <p className="mt-1 text-xs text-red-600">{errors.slot_hours_json}</p>}
                <div className="mt-2">
                  <Button type="button" variant="outline" onClick={() => setSlotHoursStr(DEFAULT_SLOTS.join(","))}>
                    Réinitialiser les créneaux par défaut
                  </Button>
                </div>
              </div>

              {/* Mode papier + critères */}
              <div className="grid gap-6 md:grid-cols-12">
                <div className="md:col-span-4">
                  <div className="text-xs mb-1 text-gray-500">Mode papier</div>
                  <select
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    value={form.paper_mode}
                    onChange={(e) => setForm((f) => ({ ...f, paper_mode: e.target.value }))}
                  >
                    <option value="strict">Strict (absence d’info = non conforme)</option>
                    <option value="lenient">Souple (absence d’info = tolérée)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    <b>Strict</b> : info papier inconnue → pénalisée. <br />
                    <b>Souple</b> : info papier inconnue → tolérée.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="text-xs mb-2 text-gray-500">Critères à appliquer</div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <label className="flex items-center gap-2 text-sm" title="Internet / signal">
                      <input type="checkbox" checked={!!form.use_internet} onChange={toggle("use_internet")} />
                      <span className="inline-flex items-center gap-1">
                        <Wifi className="h-3.5 w-3.5" /> Internet
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-sm" title="TPE allumé / actif">
                      <input type="checkbox" checked={!!form.use_tpe_on} onChange={toggle("use_tpe_on")} />
                      TPE allumé
                    </label>
                    <label className="flex items-center gap-2 text-sm" title="Position dans la zone définie">
                      <input type="checkbox" checked={!!form.use_geofence} onChange={toggle("use_geofence")} />
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> Geofence
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-sm" title="Seuil de batterie">
                      <input type="checkbox" checked={!!form.use_battery} onChange={toggle("use_battery")} />
                      <span className="inline-flex items-center gap-1">
                        <BatteryCharging className="h-3.5 w-3.5" /> Batterie
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-sm" title="État imprimante">
                      <input type="checkbox" checked={!!form.use_printer} onChange={toggle("use_printer")} />
                      <span className="inline-flex items-center gap-1">
                        <Printer className="h-3.5 w-3.5" /> Imprimante
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-sm" title="Présence de papier">
                      <input type="checkbox" checked={!!form.use_paper} onChange={toggle("use_paper")} />
                      Papier
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <FlagChip on={form.use_internet} label="Internet" icon={Wifi} />
                    <FlagChip on={form.use_tpe_on} label="TPE allumé" />
                    <FlagChip on={form.use_geofence} label="Geofence" icon={MapPin} />
                    <FlagChip on={form.use_battery} label="Batterie" icon={BatteryCharging} />
                    <FlagChip on={form.use_printer} label="Imprimante" icon={Printer} />
                    <FlagChip on={form.use_paper} label="Papier" icon={FileText} />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
                <Button type="submit" disabled={!canSubmit || saving} title={!canSubmit ? "Complétez les champs requis" : isEdit ? "Mettre à jour" : "Créer"}>
                  <LoaderInline spinning={saving}>{isEdit ? "Mettre à jour" : "Créer"}</LoaderInline>
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

/* --------------- PAGE PRINCIPALE --------------- */
export default function Policies() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // pagination / filtres
  const [serverPaged, setServerPaged] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [savingDeleteId, setSavingDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listPolicies({ page, pageSize, search });
      setServerPaged(!!r?.serverPaged);
      const arr = r?.rows || r?.data || [];
      setRows(arr);
      setTotal(r?.total ?? arr.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, pageSize, search]);

  const clientPaged = useMemo(() => {
    if (serverPaged) return rows;
    let data = rows;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((r) => r.name?.toLowerCase().includes(q) || String(r.id).includes(q));
    }
    setTotal(data.length);
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [rows, serverPaged, search, page, pageSize]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setModalOpen(true); };

  const onSaveModal = async (payload, id) => {
    const forced = { ...payload, status: "active" };
    if (id) {
      await notify(updatePolicy(id, forced), { loading: "Mise à jour…", success: "Règle mise à jour" });
    } else {
      await notify(createPolicy(forced), { loading: "Création…", success: "Règle créée" });
    }
    setModalOpen(false);
    await load();
  };

  const onDelete = async (id) => {
    if (!window.confirm("Supprimer cette règle ?")) return;
    setSavingDeleteId(id);
    try {
      await notify(deletePolicy(id), { loading: "Suppression…", success: "Supprimée" });
      await load();
    } finally {
      setSavingDeleteId(null);
    }
  };

  const tableRows = serverPaged ? rows : clientPaged;

  return (
    <div className="space-y-6">
      <ComponentCard
        title="Règles de disponibilité"
        desc="Créez et gérez les politiques de conformité (jour & semaine)."
        rightSlot={
          <div className="flex items-center gap-2">
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nouvelle politique
            </Button>
            <Button type="button" variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
            </Button>
          </div>
        }
      >
        {/* Filtres top bar (sans filtre de statut) */}
        <div className="mb-4 grid gap-3 md:grid-cols-12">
          <div className="md:col-span-8">
            <div className="text-xs mb-1 text-gray-500">Recherche (nom ou ID)</div>
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            />
          </div>
          <div className="md:col-span-4">
            <div className="text-xs mb-1 text-gray-500">Taille de page</div>
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={pageSize}
              onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
            >
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 text-gray-500 text-theme-xs whitespace-nowrap w-16">ID</th>
                  <th className="px-4 py-3 text-gray-500 text-theme-xs whitespace-nowrap">Nom de la règle</th>
                  <th className="px-4 py-3 text-gray-500 text-theme-xs whitespace-nowrap w-24">Statut</th>
                  <th className="px-4 py-3 text-gray-500 text-theme-xs whitespace-nowrap w-24 text-right">Batt. (%)</th>
                  <th className="px-4 py-3 text-gray-500 text-theme-xs whitespace-nowrap w-24 text-right">Éch./j</th>
                  <th className="px-4 py-3 text-gray-500 text-theme-xs whitespace-nowrap w-24 text-right">Jours KO</th>
                  <th className="px-4 py-3 text-gray-500 text-theme-xs whitespace-nowrap w-28 text-right">Créneaux KO</th>
                  <th className="px-4 py-3 text-gray-500 text-theme-xs whitespace-nowrap">Créneaux évalués</th>
                  <th className="px-4 py-3 text-gray-500 text-theme-xs whitespace-nowrap">Critères activés</th>
                  <th className="px-4 py-3 text-gray-500 text-theme-xs whitespace-nowrap w-28">Mode papier</th>
                  <th className="px-4 py-3 text-gray-500 text-theme-xs whitespace-nowrap text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      {Array.from({ length: 11 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 w-full max-w-[140px] rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!loading && tableRows.map((r) => {
                  const slots =
                    Array.isArray(r.slot_hours_json)
                      ? r.slot_hours_json.join(", ")
                      : typeof r.slot_hours_json === "string"
                      ? r.slot_hours_json
                      : "";
                  const flags =
                    ["internet", "tpe_on", "geofence", "battery", "printer", "paper"]
                      .filter((k) => r[`use_${k}`])
                      .map((k) =>
                        ({ internet: "Internet", tpe_on: "TPE allumé", geofence: "Geofence", battery: "Batterie", printer: "Imprimante", paper: "Papier" }[k])
                      )
                      .join(" · ") || "—";
                  const paperMode = r.paper_mode === "strict" ? "Strict" : r.paper_mode === "lenient" ? "Souple" : "—";
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3 whitespace-nowrap w-16 tabular-nums">{r.id}</td>
                      <td className="px-4 py-3 max-w-[260px] truncate" title={r.name}>{r.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap w-24"><StatusBadge s={r.status} /></td>
                      <td className="px-4 py-3 whitespace-nowrap w-24 text-right tabular-nums">{r.battery_min_pct}%</td>
                      <td className="px-4 py-3 whitespace-nowrap w-24 text-right tabular-nums">{r.daily_fail_N}</td>
                      <td className="px-4 py-3 whitespace-nowrap w-24 text-right tabular-nums">{r.weekly_fail_days}</td>
                      <td className="px-4 py-3 whitespace-nowrap w-28 text-right tabular-nums">{r.weekly_fail_slots}</td>
                      <td className="px-4 py-3 max-w-[260px] truncate" title={slots}>{slots || "—"}</td>
                      <td className="px-4 py-3 max-w-[280px] truncate" title={flags}>{flags}</td>
                      <td className="px-4 py-3 whitespace-nowrap w-28">{paperMode}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap w-28">
                        <div className="inline-flex items-center gap-2">
                          <button
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-white/5"
                            title="Modifier"
                            aria-label="Modifier"
                            onClick={() => openEdit(r)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-60"
                            title="Supprimer"
                            aria-label="Supprimer"
                            disabled={savingDeleteId === r.id}
                            onClick={() => onDelete(r.id)}
                          >
                            {savingDeleteId === r.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && !tableRows.length && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-500" colSpan={11}>
                      Aucune règle trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
            <div className="text-gray-500">
              {total ? <>Total : <span className="font-medium text-gray-800 dark:text-white">{total}</span></> : "—"}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Précédent
              </Button>
              <span className="text-gray-600">Page <span className="font-medium">{page}</span></span>
              <Button variant="outline" type="button" disabled={page * pageSize >= total || loading} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* Modal Create/Edit */}
      <PolicyModal open={modalOpen} onClose={() => setModalOpen(false)} initial={editing} onSave={onSaveModal} />
    </div>
  );
}
