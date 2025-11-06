// src/services/availability.js
// Services Availability (Daily & Weekly) — utilisent api.js

import { api } from "../lib/api.js";


  // ---------- DAILY ----------
  /**
   * Calcule et enregistre la dispo du jour (upsert kpi2_daily_results)
   * body: { date: 'YYYY-MM-DD', policyId?: number }
   */

  export const  computeDaily = (body) => {
    return api.post("/api/availability/daily/compute", body);
  }

  export const getDaily = (params) => {
    return api.get("/api/availability/daily", params);
  };


  export const computeWeekly = (body) => {
    return api.post("/api/availability/weekly/compute", body);
  }


  export const getWeekly = (params) => {
    return api.get("/api/availability/weekly", params);
  }
