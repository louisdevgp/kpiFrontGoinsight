// src/services/bi.js
import { api } from "../lib/api";

export function exportDailyCSV(params) {
  // retourne une URL directe (download)
  const q = new URLSearchParams(params).toString();
  return `/api/export/daily/export?${q}`;
}

export function exportWeeklyCSV(params) {
  const q = new URLSearchParams(params).toString();
  return `/api/export/weekly/export?${q}`;
}
