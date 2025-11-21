// src/lib/api.js
import { toast } from 'sonner'
import axios from 'axios'

const DEFAULT_BASE = "https://kpiapijs.onrender.com"
const BASE_URL = (import.meta?.env?.VITE_API_BASE) || DEFAULT_BASE

// --- Axios client
const client = axios.create({
  baseURL: BASE_URL,
  headers: { Accept: 'application/json' },
  withCredentials: false,
  timeout: 180000,
})

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

  // ---- NEW: téléchargement blob (CSV) en réutilisant le même client/baseURL
  async getBlob(path, params, accept = 'text/csv,application/octet-stream') {
    const res = await client.get(path, {
      params,
      responseType: 'blob',
      headers: { Accept: accept },
      validateStatus: (s) => s >= 200 && s < 400,
    })
    return res
  },
}

function parseFilenameFromCD(cd) {
  if (!cd) return null
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(cd)
  return m ? decodeURIComponent(m[1]) : null
}

export async function download(path, params = {}) {
  const res = await api.getBlob(path, params, 'text/csv,application/octet-stream')

  const ct = (res.headers['content-type'] || '').toLowerCase()
  if (ct.includes('text/html')) {
    // Si tu tombes encore ici: la route n’a pas été proxyée vers l’API
    // (fallback SPA t’a renvoyé index.html)
    // Petit bonus debug (si le blob le permet) :
    try {
      const txt = await res.data.text?.()
      console.error('Export a renvoyé du HTML (fallback SPA).', txt?.slice(0, 200))
    } catch {}
    throw new Error("Le téléchargement a renvoyé de l'HTML (route proxy ou serveur mal configuré).")
  }

  const filename =
    parseFilenameFromCD(res.headers['content-disposition']) ||
    `export_${new Date().toISOString().slice(0, 10)}.csv`

  const blob = new Blob([res.data], { type: ct || 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  URL.revokeObjectURL(link.href)
  link.remove()
}
