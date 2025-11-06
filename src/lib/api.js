// src/lib/api.js
import { toast } from 'sonner'
import axios from 'axios'

const DEFAULT_BASE = 'http://localhost:5000'
const BASE_URL = (import.meta?.env?.VITE_API_BASE) || DEFAULT_BASE

// --- Axios client
const client = axios.create({
  baseURL: BASE_URL,
  headers: { Accept: 'application/json' },
  withCredentials: false,
  timeout: 180000, // 3 minutes (évite ECONNABORTED à 60s sur /compute)
})

// Normalise les erreurs axios -> e.normalizedMessage
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      'Requête échouée'
    err.normalizedMessage = msg
    return Promise.reject(err)
  }
)

// --- notify: affiche les toasts mais RENVOIE le résultat du promise
export function notify(promise, {
  loading = 'Traitement…',
  success = 'OK',
  error = (e) => e?.normalizedMessage || e?.message || 'Erreur',
} = {}) {
  const p = Promise.resolve(promise)
  toast.promise(p, { loading, success, error })
  return p
}

export const api = {
  baseUrl: BASE_URL,

  setBaseUrl(url) {
    this.baseUrl = url
    client.defaults.baseURL = url
  },

  async get(path, params) {
    const res = await client.get(path, { params })
    return res.data
  },

  async post(path, body) {
    const res = await client.post(path, body, {
      headers: { 'Content-Type': 'application/json' },
    })
    return res.data
  },

  async put(path, body) {
    const res = await client.put(path, body, {
      headers: { 'Content-Type': 'application/json' },
    })
    return res.data
  },

  async del(path) {
    const res = await client.delete(path)
    return res.data
  },
}

export async function download(url, params) {
  // construit l’URL avec query, fetch en blob et force un téléchargement .csv
  const q = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(url + q, { credentials: "include" });
  if (!res.ok) throw new Error("download failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = url.includes("weekly") ? "weekly_export.csv" : "daily_export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
