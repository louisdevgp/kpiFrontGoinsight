import { useEffect, useState } from 'react';
import ComponentCard from '../components/ui/ComponentCard';
import { api } from '../lib/api';

export default function Settings() {
  const [health, setHealth] = useState(null);
  useEffect(() => { api.get('/health').then(setHealth).catch(()=>setHealth({ ok:false })); }, []);

  return (
    <div className="space-y-6">
      <ComponentCard title="Paramètres">
        <div className="text-sm">
          <div className="mb-2 text-gray-500">Base API</div>
          <code className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-white/[0.06]">{api.baseUrl}</code>
        </div>
        <div className="mt-4">
          <div className="mb-2 text-sm text-gray-500">Santé du backend</div>
          <pre className="rounded-lg border bg-gray-50 p-3 text-xs dark:border-gray-800 dark:bg-white/[0.03]">
            {health ? JSON.stringify(health, null, 2) : '…'}
          </pre>
        </div>
      </ComponentCard>
    </div>
  );
}
