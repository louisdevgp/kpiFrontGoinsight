import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import DatePicker from "../../components/form/date-picker";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { api, notify } from "../../lib/api";
import { toMondayISO } from "../../utils/date";
import { Lock, ShieldCheck, CalendarDays, RefreshCw, AlertCircle } from "lucide-react";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export default function PolicyWeekCard() {
  const [weekStart, setWeekStart] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [lockInfo, setLockInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onWeekChange = (_d, dateStr) => setWeekStart(toMondayISO(dateStr));

  const canSubmit = useMemo(() => !!policyId && !!weekStart && !loading, [policyId, weekStart, loading]);

  const lock = async () => {
    if (!canSubmit) return;
    setErr("");
    setLoading(true);
    try {
      const res = await notify(
        api.post(`/api/locks/${policyId}/lock`, { week_start: weekStart }),
        { loading: "Verrouillage…", success: "Semaine verrouillée" }
      );
      setLockInfo(res);
    } catch (e) {
      setErr(e?.response?.data?.message || "Échec du verrouillage de la semaine.");
    } finally {
      setLoading(false);
    }
  };

  // (Optionnel) Lecture de l'état courant du lock si ton backend l'expose
  const refreshLock = async () => {
    setErr("");
    setLoading(true);
    try {
      // Ajuste l’endpoint si besoin (ex: /api/locks/current?week_start=YYYY-MM-DD)
      const res = await api.get("/api/locks/current");
      setLockInfo(res);
    } catch (e) {
      setErr("Impossible de récupérer l'état de verrouillage.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Si tu veux précharger l'état au montage :
    // refreshLock();
  }, []);

  return (
    <ComponentCard
      title="Semaine verrouillée"
      desc="Associez une règle de disponibilité à la semaine (fige les critères)."
      right={
        <Button variant="outline" onClick={refreshLock} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Rafraîchir l’état
        </Button>
      }
    >
      {err && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{err}</span>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-5">
        <div className="md:col-span-2">
          <DatePicker
            id="dash_lock_week"
            label="Semaine (lundi)"
            placeholder="YYYY-MM-DD"
            onChange={onWeekChange}
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs mb-1 text-gray-500">Policy ID</div>
          <Input
            type="number"
            placeholder="ex: 1"
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <Button onClick={lock} disabled={!canSubmit}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Traitement…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-1" /> Verrouiller la semaine
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Résumé du lock */}
      {lockInfo && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div className="text-sm font-semibold">Semaine verrouillée</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
              <div className="text-xs text-gray-500">Policy</div>
              <div className="mt-1 inline-flex items-center gap-2 text-sm font-medium">
                <Lock className="h-4 w-4 text-gray-500" />
                {String((lockInfo.policy_id ?? lockInfo.policyId ?? policyId) || "—")}
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
              <div className="text-xs text-gray-500">Semaine (lundi)</div>
              <div className="mt-1 inline-flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                {fmt(lockInfo.week_start ?? weekStart)}
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
              <div className="text-xs text-gray-500">Créé le</div>
              <div className="mt-1 text-sm font-medium">
                {fmt(lockInfo.created_at || lockInfo.createdAt)}
              </div>
            </div>
          </div>

          {/* Raw (debug/dev) */}
          <details className="mt-3 group">
            <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400">
              Détails JSON
            </summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-black/30">
{JSON.stringify(lockInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </ComponentCard>
  );
}
