// src/services/policiesService.js
import { api } from "../lib/api";

/** Charge la liste des policies.
 *  Si l'API renvoie { data, meta:{total} }, on fait une pagination serveur.
 *  Sinon, on renvoie tout et on laisse le front paginer.
 */
export async function listPolicies({ page = 1, pageSize = 10, search = "", status = "" } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (search) params.set("search", search);
  if (status) params.set("status", status);

  const r = await api.get(`/api/policies?${params.toString()}`);

  // Cas 1: backend paginate -> { data, meta: { total } }
  if (r && r.data && Array.isArray(r.data)) {
    const total = r.meta?.total ?? r.total ?? r.count ?? r.data.length;
    return { rows: r.data, total, serverPaged: true };
  }

  // Cas 2: backend renvoie un tableau brut
  const rows = Array.isArray(r) ? r : (Array.isArray(r.data) ? r.data : []);
  return { rows, total: rows.length, serverPaged: false };
}

export async function createPolicy(payload) {
  return api.post("/api/policies", payload);
}

export async function updatePolicy(id, payload) {
  return api.put(`/api/policies/${id}`, payload);
}

export async function deletePolicy(id) {
  return api.del(`/api/policies/${id}`);
}
