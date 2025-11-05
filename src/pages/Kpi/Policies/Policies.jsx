import { useEffect, useMemo, useState } from "react";
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

const DEFAULT_SLOTS = [12, 13, 14, 15, 17, 18, 19];
const DEFAULT_FORM = {
  name: "",
  battery_min_pct: 20,
  daily_fail_N: 1,
  weekly_fail_days: 1,
  weekly_fail_slots: 6,
  slot_hours_json: DEFAULT_SLOTS,
  use_internet: 1,
  use_tpe_on: 1,
  use_geofence: 1,
  use_battery: 1,
  use_printer: 1,
  use_paper: 1,
  // Statut forcé
  status: "active",
};

function StatusBadge({ s }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
        s === "active" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
      }`}
      title={s === "active" ? "La règle est active" : "La règle est en brouillon"}
    >
      {s === "active" ? "Actif" : "Brouillon"}
    </span>
  );
}

function FlagChip({ on = 0, label }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${
        on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500"
      }`}
    >
      {label}
    </span>
  );
}

/* ------------------ MODAL ------------------ */
function PolicyModal({ open, onClose, initial, onSave }) {
  const isEdit = !!initial?.id;

  const [form, setForm] = useState(initial || DEFAULT_FORM);
  const [slotHoursStr, setSlotHoursStr] = useState(
    Array.isArray(initial?.slot_hours_json)
      ? initial.slot_hours_json.join(",")
      : DEFAULT_SLOTS.join(",")
  );

  useEffect(() => {
    if (open) {
      // Force toujours "active"
      const base = initial
        ? { ...initial, status: "active" }
        : { ...DEFAULT_FORM, status: "active" };
      setForm(base);
      setSlotHoursStr(
        Array.isArray(base.slot_hours_json)
          ? base.slot_hours_json.join(",")
          : DEFAULT_SLOTS.join(",")
      );
    }
  }, [open, initial]);

  const setNum = (key) => (e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }));
  const setStr = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggle = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked ? 1 : 0 }));

  const parsedSlots = useMemo(() => {
    const nums = slotHoursStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
    const clean = Array.from(
      new Set(nums.map((n) => Math.round(n)).filter((n) => n >= 0 && n <= 23))
    ).sort((a, b) => a - b);
    return clean.length ? clean : [];
  }, [slotHoursStr]);

  const errors = useMemo(() => {
    const e = {};
    if (!form.name?.trim()) e.name = "Le nom est requis.";
    if (!Number.isFinite(form.battery_min_pct) || form.battery_min_pct < 0 || form.battery_min_pct > 100) {
      e.battery_min_pct = "La valeur doit être entre 0 et 100.";
    }
    ["daily_fail_N", "weekly_fail_days", "weekly_fail_slots"].forEach((k) => {
      const v = form[k];
      if (!Number.isFinite(v) || v < 0) e[k] = "Doit être un nombre ≥ 0.";
    });
    if (!parsedSlots.length) e.slot_hours_json = "Ajoutez au moins un créneau (heures 0–23).";
    return e;
  }, [form, parsedSlots]);

  const canSubmit = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const save = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;

    const payload = {
      ...form,
      status: "active", // sécurité : force dans le payload
      slot_hours_json: parsedSlots.length ? parsedSlots : DEFAULT_SLOTS,
      use_internet: form.use_internet ? 1 : 0,
      use_tpe_on: form.use_tpe_on ? 1 : 0,
      use_geofence: form.use_geofence ? 1 : 0,
      use_battery: form.use_battery ? 1 : 0,
      use_printer: form.use_printer ? 1 : 0,
      use_paper: form.use_paper ? 1 : 0,
    };

    await onSave(payload, isEdit ? initial.id : undefined);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3">
      <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/[0.06] dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">
              {isEdit ? "Modifier une règle de disponibilité" : "Créer une règle de disponibilité"}
            </h3>
            <p className="text-sm text-gray-500">
              Définissez des critères lisibles pour vos équipes (libellés simplifiés).
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"
            title="Fermer"
          >
            Fermer ✕
          </button>
        </div>

        <form onSubmit={save} className="mt-5 grid gap-6">
          {/* Ligne 1 : Nom (Statut masqué) */}
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-9">
              <div className="text-xs mb-1 text-gray-500">Nom de la règle</div>
              <Input placeholder="Ex: Semaine 44 — Standard" value={form.name} onChange={setStr("name")} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            {/* Indicatif de statut (lecture seule, masqué côté champ, mais visible comme badge) */}
            <div className="md:col-span-3 flex items-end">
              <StatusBadge s="active" />
            </div>
          </div>

          {/* Ligne 2 : Seuils */}
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-3">
              <div className="text-xs mb-1 text-gray-500">Seuil batterie min. (%)</div>
              <Input type="number" min="0" max="100" value={form.battery_min_pct} onChange={setNum("battery_min_pct")} />
              {errors.battery_min_pct && <p className="mt-1 text-xs text-red-600">{errors.battery_min_pct}</p>}
            </div>
            <div className="md:col-span-3">
              <div className="text-xs mb-1 text-gray-500" title="Nombre d’échecs tolérés par jour avant non-conformité">
                Échecs max / jour
              </div>
              <Input type="number" min="0" value={form.daily_fail_N} onChange={setNum("daily_fail_N")} />
              {errors.daily_fail_N && <p className="mt-1 text-xs text-red-600">{errors.daily_fail_N}</p>}
            </div>
            <div className="md:col-span-3">
              <div className="text-xs mb-1 text-gray-500" title="Nombre de jours non conformes tolérés dans la semaine">
                Jours non conformes / semaine
              </div>
              <Input type="number" min="0" value={form.weekly_fail_days} onChange={setNum("weekly_fail_days")} />
              {errors.weekly_fail_days && <p className="mt-1 text-xs text-red-600">{errors.weekly_fail_days}</p>}
            </div>
            <div className="md:col-span-3">
              <div className="text-xs mb-1 text-gray-500" title="Nombre de créneaux non conformes tolérés dans la semaine">
                Créneaux non conformes / semaine
              </div>
              <Input type="number" min="0" value={form.weekly_fail_slots} onChange={setNum("weekly_fail_slots")} />
              {errors.weekly_fail_slots && <p className="mt-1 text-xs text-red-600">{errors.weekly_fail_slots}</p>}
            </div>
          </div>

          {/* Ligne 3 : Créneaux */}
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-12">
              <div className="text-xs mb-1 text-gray-500">Créneaux contrôlés (heures séparées par virgules)</div>
              <Input
                placeholder="Ex: 8,9,12,13,14,17,18"
                value={slotHoursStr}
                onChange={(e) => setSlotHoursStr(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {parsedSlots.map((h) => (
                  <button
                    key={h}
                    type="button"
                    title="Retirer ce créneau"
                    onClick={() => {
                      const next = parsedSlots.filter((x) => x !== h).join(",");
                      setSlotHoursStr(next);
                    }}
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
          </div>

          {/* Ligne 4 : Critères */}
          <div>
            <div className="text-xs mb-2 text-gray-500">Critères utilisés</div>
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-6">
              <label className="flex items-center gap-2 text-sm" title="Qualité de la connexion">
                <input type="checkbox" checked={!!form.use_internet} onChange={toggle("use_internet")} /> Internet
              </label>
              <label className="flex items-center gap-2 text-sm" title="TPE allumé / actif">
                <input type="checkbox" checked={!!form.use_tpe_on} onChange={toggle("use_tpe_on")} /> TPE allumé
              </label>
              <label className="flex items-center gap-2 text-sm" title="TPE dans la zone autorisée">
                <input type="checkbox" checked={!!form.use_geofence} onChange={toggle("use_geofence")} /> Geofence
              </label>
              <label className="flex items-center gap-2 text-sm" title="Niveau de batterie">
                <input type="checkbox" checked={!!form.use_battery} onChange={toggle("use_battery")} /> Batterie
              </label>
              <label className="flex items-center gap-2 text-sm" title="État de l’imprimante">
                <input type="checkbox" checked={!!form.use_printer} onChange={toggle("use_printer")} /> Imprimante
              </label>
              <label className="flex items-center gap-2 text-sm" title="Présence de papier (dérivé de l’état imprimante)">
                <input type="checkbox" checked={!!form.use_paper} onChange={toggle("use_paper")} /> Papier
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <FlagChip on={form.use_internet} label="Internet" />
              <FlagChip on={form.use_tpe_on} label="TPE allumé" />
              <FlagChip on={form.use_geofence} label="Geofence" />
              <FlagChip on={form.use_battery} label="Batterie" />
              <FlagChip on={form.use_printer} label="Imprimante" />
              <FlagChip on={form.use_paper} label="Papier" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              title={!canSubmit ? "Complétez les champs requis" : (isEdit ? "Mettre à jour la règle" : "Créer la règle")}
            >
              {isEdit ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
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
  const [statusFilter, setStatusFilter] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listPolicies({ page, pageSize, search, status: statusFilter });
      setServerPaged(!!r.serverPaged);
      setRows(r.rows || []);
      setTotal(Number(r.total || 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter]);

  // pagination client fallback + filtres front
  const tableRows = useMemo(() => {
    if (serverPaged) return rows;
    let data = rows;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) => r.name?.toLowerCase().includes(q) || String(r.id).includes(q)
      );
    }
    if (statusFilter) data = data.filter((r) => r.status === statusFilter);
    setTotal(data.length);
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [rows, serverPaged, search, statusFilter, page, pageSize]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const onSaveModal = async (payload, id) => {
    // sécurité : force "active" avant envoi
    const toSend = { ...payload, status: "active" };
    if (id) {
      await notify(updatePolicy(id, toSend), { loading: "Mise à jour…", success: "Règle mise à jour" });
    } else {
      await notify(createPolicy(toSend), { loading: "Création…", success: "Règle créée" });
    }
    setModalOpen(false);
    await load();
  };

  const onDelete = async (id) => {
    if (!window.confirm("Supprimer cette règle ?")) return;
    await notify(deletePolicy(id), { loading: "Suppression…", success: "Supprimée" });
    await load();
  };

  const isNextDisabled = page * pageSize >= total;

  return (
    <div className="space-y-6">
      <ComponentCard
        title="Règles de disponibilité"
        desc="Créer, modifier et supprimer des règles lisibles pour vos équipes."
        rightSlot={
          <div className="flex items-center gap-2">
            <Button onClick={openCreate}>Nouvelle règle</Button>
          </div>
        }
      >
        {/* Filtres top bar */}
        <div className="mb-4 grid gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <Input
              placeholder="Rechercher par nom ou référence…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <div className="md:col-span-3">
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
              title="Filtrer par statut"
            >
              <option value="">Tous statuts</option>
              <option value="active">Actif</option>
              <option value="draft">Brouillon</option>
            </select>
          </div>
          <div className="md:col-span-3 flex items-center justify-end gap-2">
            <select
              className="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              title="Taille de page"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap">Réf.</th>
                  <th className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap">Nom de la règle</th>
                  <th className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap">Statut</th>
                  <th className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap" title="Seuil minimum de batterie accepté">
                    Seuil batterie min.
                  </th>
                  <th className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap" title="Échecs tolérés avant non-conformité (par jour)">
                    Échecs max / jour
                  </th>
                  <th className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap" title="Nombre de jours non conformes tolérés">
                    Jours non conformes / sem.
                  </th>
                  <th className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap" title="Nombre de créneaux non conformes tolérés">
                    Créneaux non conformes / sem.
                  </th>
                  <th className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap" title="Créneaux (heures) suivis">
                    Créneaux contrôlés
                  </th>
                  <th className="px-5 py-3 text-gray-500 text-theme-xs whitespace-nowrap">Critères utilisés</th>
                  <th className="px-5 py-3 text-gray-500 text-theme-xs"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {tableRows.map((r) => {
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
                        ({
                          internet: "Internet",
                          tpe_on: "TPE allumé",
                          geofence: "Geofence",
                          battery: "Batterie",
                          printer: "Imprimante",
                          paper: "Papier",
                        }[k])
                      )
                      .join(" / ") || "—";

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 whitespace-nowrap">{r.id}</td>
                      <td className="px-5 py-3 max-w-[260px] truncate" title={r.name}>{r.name}</td>
                      <td className="px-5 py-3 whitespace-nowrap"><StatusBadge s={r.status || "active"} /></td>
                      <td className="px-5 py-3 whitespace-nowrap">{r.battery_min_pct}%</td>
                      <td className="px-5 py-3 whitespace-nowrap">{r.daily_fail_N}</td>
                      <td className="px-5 py-3 whitespace-nowrap">{r.weekly_fail_days}</td>
                      <td className="px-5 py-3 whitespace-nowrap">{r.weekly_fail_slots}</td>
                      <td className="px-5 py-3 max-w-[280px] truncate" title={slots}>{slots}</td>
                      <td className="px-5 py-3 max-w-[280px] truncate" title={flags}>{flags}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap flex items-center gap-2">
                        <Button variant="outline" onClick={() => openEdit(r)}>Modifier</Button>
                        <Button variant="outline" onClick={() => onDelete(r.id)}>Supprimer</Button>
                      </td>
                    </tr>
                  );
                })}
                {!tableRows.length && (
                  <tr>
                    <td className="px-5 py-5 text-center text-gray-500" colSpan={10}>
                      {loading ? "Chargement…" : "Aucune règle"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
            <div className="text-gray-500">
              {total ? (
                <>Total : <span className="font-medium text-gray-800 dark:text-white">{total}</span></>
              ) : (
                "—"
              )}
            </div>
            <div className="flex items-center gap-2">
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
                disabled={isNextDisabled}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* Modal Create/Edit */}
      <PolicyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        onSave={onSaveModal}
      />
    </div>
  );
}
