// src/services/metrics.js
import { api } from "../lib/api";

export async function getLatestSummary(policyId) {
  // params envoyés dans la query string
  return api.get("/api/metrics/metrics/summary/latest", { policyId });
}
