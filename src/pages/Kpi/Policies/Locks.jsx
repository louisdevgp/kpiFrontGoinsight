import Select from "../../../components/form/Select";
import { useState, useEffect, useMemo } from "react";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField"; // (pas utilisé, laissé si besoin)
import DatePicker from "../../../components/form/date-picker";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/ui/table"; // (pas utilisé ici)
import Badge from "../../../components/ui/badge/Badge";
import { api, notify } from "../../../lib/api";
import { toMondayISO } from "../../../utils/date";
import { RefreshCw, AlertTriangle } from "lucide-react";

export default function Locks() {
  const [policies, setPolicies] = useState([]);
  const [polLoading, setPolLoading] = useState(false);
  const [polErr, setPolErr] = useState("");

  const [policyId, setPolicyId] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [locked, setLocked] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const onWeekChange = (_dates, dateStr) => setWeekStart(toMondayISO(dateStr));

  const selectedPolicy = useMemo(
    () => policies.find((p) => String(p.id) === String(policyId)) || null,
    [policies, policyId]
  );

  // Charger la liste des policies
  const loadPolicies = async () => {
    setPolLoading(true);
    setPolErr("");
    try {
      const r = await api.get("/api/policies");
      setPolicies(Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []);
    } catch (e) {
      setPolErr(e?.response?.data?.message || "Impossible de charger les règles de disponibilité.");
      setPolicies([]);
    } finally {
      setPolLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  // Verrouiller la semaine
  const lock = async (e) => {
    e?.preventDefault?.();
    setErr("");
    if (!policyId || !weekStart) {
      setErr("Veuillez sélectionner une règle et un lundi de semaine.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await notify(
        api.post(`/api/locks/${policyId}/lock`, { week_start: weekStart }),
        { loading: "Verrouillage…", success: "Semaine verrouillée" }
      );
      // Certains wrappers renvoient {data:...}, d'autres l'objet direct
      setLocked(res?.data ?? res ?? null);
    } catch (e) {
      setErr(e?.response?.data?.message || "Échec du verrouillage de la semaine.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(policyId && weekStart) && !submitting;

  return (
    <div className="space-y-6">
      <ComponentCard
        title="Semaine verrouillée"
        desc="Associez une règle de disponibilité à une semaine (fige les critères utilisés pour les agrégations)."
      >
        {/* Toolbar / Actions rapides */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-gray-500">
            {selectedPolicy ? (
              <span>
                Règle sélectionnée : <b>{selectedPolicy.name}</b>
              </span>
            ) : (
              <span>Aucune règle sélectionnée</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                loadPolicies();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Recharger les règles
            </Button>
          </div>
        </div>

        {/* Erreur de chargement de policies */}
        {polErr && (
          <div className="mb-4 inline-flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{polErr}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={lock} className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-xs mb-1 text-gray-500">Règle de disponibilité</div>
            <Select
              options={[
                { label: polLoading ? "Chargement…" : "Sélectionner…", value: "" },
                ...policies.map((p) => ({ label: p.name, value: String(p.id) })),
              ]}
              defaultValue=""
              onChange={setPolicyId}
              disabled={polLoading}
            />
          </div>

          <DatePicker
            id="lock_week"
            label="Début de semaine (lundi)"
            placeholder="YYYY-MM-DD"
            onChange={onWeekChange}
          />

          <div className="flex items-end">
            <Button disabled={!canSubmit}>
              {submitting ? "Verrouillage…" : "Verrouiller la semaine"}
            </Button>
          </div>
        </form>

        {/* Aide / validations */}
        {(!policyId || !weekStart) && (
          <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Sélectionnez <b>une règle</b> et <b>un lundi</b> avant de verrouiller.
            </span>
          </div>
        )}
        {err && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Résumé du lock */}
        {locked && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge size="sm" color="success">Verrouillée</Badge>
                <span className="text-sm text-gray-600">
                  {locked.week_start ? `Semaine : ${locked.week_start}` : "Semaine verrouillée"}
                  {locked.policy_id ? ` • Policy #${locked.policy_id}` : ""}
                </span>
              </div>
            </div>

            <div className="rounded-lg border bg-gray-50 p-3 text-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="max-h-64 overflow-auto">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(locked, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
