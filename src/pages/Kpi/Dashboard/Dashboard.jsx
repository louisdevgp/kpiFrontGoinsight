import { useEffect, useState } from 'react';
import ComponentCard from '../components/ui/ComponentCard';
import Button from '../components/ui/Button';
import { api } from '../lib/api';

export default function Dashboard() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api.get('/health').then(setHealth).catch(() => setHealth({ ok: false }));
  }, []);

  return (
    <div className="space-y-6">
      <ComponentCard title="Tableau de bord" desc="Vue d’ensemble des indicateurs clés.">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">API</div>
            <div className="text-lg font-semibold">Santé du backend</div>
            <pre className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs dark:border-gray-800 dark:bg-white/[0.03]">
              {health ? JSON.stringify(health, null, 2) : '…'}
            </pre>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Disponibilité</div>
            <div className="text-lg font-semibold">Suivi quotidien des TPE</div>
            <div className="mt-3">
              <Button variant="outline" onClick={() => (window.location.href = '/availability/daily')}>
                Ouvrir
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Disponibilité</div>
            <div className="text-lg font-semibold">Bilan hebdomadaire des TPE</div>
            <div className="mt-3">
              <Button variant="outline" onClick={() => (window.location.href = '/availability/weekly')}>
                Ouvrir
              </Button>
            </div>
          </div>
        </div>
      </ComponentCard>
    </div>
  );
}
