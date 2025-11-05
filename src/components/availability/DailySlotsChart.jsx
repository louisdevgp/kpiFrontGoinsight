import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import { api, notify } from "../../lib/api";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export default function DailySlotsChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await notify(api.get("/api/metrics/daily_slots"), {
        loading: "Chargement…",
      });
      setData(res || { ok: 0, fail: 0 });
    } catch (e) {
      setErr("Impossible de charger les créneaux du jour.");
      setData({ ok: 0, fail: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ok = Number(data?.ok ?? 0);
  const fail = Number(data?.fail ?? 0);
  const total = ok + fail;
  const okPct = total ? Math.round((ok / total) * 100) : 0;
  const failPct = total ? 100 - okPct : 0;

  const Stat = ({ label, value, pct, tone = "ok" }) => {
    const isOk = tone === "ok";
    const color =
      isOk
        ? "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10"
        : "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10";
    const Icon = isOk ? CheckCircle2 : XCircle;

    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${color}`}>
            <Icon className="h-4 w-4" />
            {label}
          </span>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{pct}%</div>
        </div>
      </div>
    );
  };

  const ProgressBar = useMemo(() => {
    const widthOk = `${okPct}%`;
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-1 text-xs text-gray-500 dark:text-gray-400">
          <span>OK {okPct}%</span>
          <span>FAIL {failPct}%</span>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]"
          role="progressbar"
          aria-valuenow={okPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Part des créneaux OK"
          title={`OK ${okPct}% / FAIL ${failPct}%`}
        >
          <div className="h-3 bg-emerald-500" style={{ width: widthOk }} />
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Total créneaux : <span className="font-medium">{total}</span>
        </div>
      </div>
    );
  }, [okPct, failPct, total]);

  return (
    <ComponentCard
      title="Répartition des créneaux (Jour)"
      desc="Créneaux horaires validés / échoués aujourd’hui."
      right={
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      }
    >
      {err && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
          <div className="col-span-full mt-2 h-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Stat label="OK" value={ok} pct={okPct} tone="ok" />
            <Stat label="FAIL" value={fail} pct={failPct} tone="fail" />
          </div>
          {ProgressBar}
        </>
      )}
    </ComponentCard>
  );
}
