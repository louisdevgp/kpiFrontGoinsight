// src/components/policies/PolicySelect.jsx
import { useEffect, useState } from "react";
import Input from "../../components/form/input/InputField"; // si tu préfères un select natif, on utilise <select>
import { listPolicies } from "../../services/policies";

export default function PolicySelect({ value, onChange, placeholder = "Choisir une règle…" }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await listPolicies({}); // { data: [...] } ou { rows: [...] }
        const arr = r?.data || r?.rows || [];
        // Actives en premier
        const sorted = [...arr].sort((a,b) => (a.status === "active" ? -1 : 1));
        setItems(sorted);
      } catch { /* noop */ }
    })();
  }, []);

  return (
    <select
      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value ? Number(e.target.value) : "")}
    >
      <option value="">{placeholder}</option>
      {items.map(p => (
        <option key={p.id} value={p.id}>
          {p.name} {p.status === "active" ? "— (Actif)" : ""}
        </option>
      ))}
    </select>
  );
}
