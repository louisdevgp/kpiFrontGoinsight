// src/services/availability.js
// Services Availability (Daily & Weekly) — utilisent api.js

import { api } from "../lib/api.js";

export const Availability = {
  // ---------- DAILY ----------
  /**
   * Calcule et enregistre la dispo du jour (upsert kpi2_daily_results)
   * body: { date: 'YYYY-MM-DD', policyId?: number }
   */
  
  computeDaily(body) {
    return api.post("/api/availability/daily/compute", body);
  },

  /**
   * Lit les résultats du jour déjà calculés
   * params: { date, policyId, page?, pageSize?, search? }
   * -> { data: [...], meta: { total, page, pageSize } }
   */
  getDaily(params) {
    return api.get("/api/availability/daily", params);
  },

  // ---------- WEEKLY ----------
  /**
   * Calcule et enregistre l’agrégat hebdo (upsert kpi2_weekly_results)
   * body: { week_start: 'YYYY-MM-DD', policyId?: number, auto?: boolean, recompute?: 'missing'|'all' }
   */
  computeWeekly(body) {
    return api.post("/api/availability/weekly/compute", body);
  },

  /**
   * Lit les résultats hebdo déjà calculés
   * params: { week_start, policyId, status?, search?, page?, pageSize?, sortBy?, order? }
   * -> { data: [...], meta: { total, page, pageSize } }
   */
  getWeekly(params) {
    return api.get("/api/availability/weekly", params);
  },
};
