const API = import.meta.env.VITE_API_URL ?? '/api/v1'
const AI  = import.meta.env.VITE_AI_URL  ?? '/ai'
const DEBUG = (import.meta.env.VITE_DEBUG_API ?? 'false').toString().toLowerCase() === 'true'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function req<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  if (DEBUG) {
    console.log('[API] Request to:', url)
    console.log('[API] Token:', token ? token.substring(0, 12) + '...' : 'NO TOKEN')
  }
  
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  }
  const isFormDataBody = typeof FormData !== 'undefined' && opts.body instanceof FormData
  if (!isFormDataBody && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  if (DEBUG) console.log('[API] Headers:', headers)

  const fetchOpts: RequestInit = { ...opts, headers, cache: 'no-store' }
  const res = await fetch(url, fetchOpts)
  const contentType = res.headers.get('content-type') ?? ''
  const json = contentType.includes('application/json') ? await res.json() : null
  
  if (DEBUG) console.log('[API] Response status:', res.status)
  if (!res.ok) {
    if (DEBUG) console.error('[API] Error response:', json)
    throw new Error((json as any)?.error ?? (json as any)?.message ?? `HTTP ${res.status}`)
  }
  
  if (DEBUG) console.log('[API] Success response:', json)
  return (json ?? ({} as unknown)) as T
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface RegisterDonorPayload {
  email: string; password: string
  first_name: string; last_name: string; phone: string
  blood_type: string; latitude: number; longitude: number
}

export interface RegisterHospitalPayload {
  email: string; password: string; hospital_name: string
  first_name: string; last_name: string
  phone: string; latitude: number; longitude: number
  license: File | null
}

export interface LoginPayload { email: string; password: string }

export interface AuthResponse {
  token: string
  user: {
    id: string; email: string; role: 'donor' | 'hospital' | 'admin'
    first_name: string; last_name: string
    phone: string; blood_type?: string
    latitude: number; longitude: number
    status: string; donation_count: number
  }
}

export const auth = {
  registerDonor: (p: RegisterDonorPayload) =>
    req<{ data: AuthResponse }>(`${API}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ ...p, role: 'donor' }),
    }),

  registerHospital: (p: RegisterHospitalPayload) => {
    const fd = new FormData()
    fd.append('email', p.email)
    fd.append('password', p.password)
    fd.append('role', 'hospital')
    fd.append('first_name', p.first_name)
    fd.append('last_name', p.last_name)
    fd.append('phone', p.phone)
    fd.append('latitude', String(p.latitude))
    fd.append('longitude', String(p.longitude))
    fd.append('hospital_name', p.hospital_name)
    if (p.license) fd.append('license', p.license)
    return req<{ data: AuthResponse }>(`${API}/auth/register`, {
      method: 'POST',
      body: fd,
    })
  },

  login: (p: LoginPayload) =>
    req<{ data: AuthResponse }>(`${API}/auth/login`, {
      method: 'POST', body: JSON.stringify(p),
    }),

  me: () => req<{ data: AuthResponse['user'] }>(`${API}/auth/me`),
}

// ── Donor ─────────────────────────────────────────────────────────────────────
export interface DonorStats {
  donation_count: number
  lives_impacted: number
  alerts_received: number
  responses_accepted: number
  responses_declined: number
  completed_donations: number
  impact_score: number
  last_donation_at: string | null
  next_eligible_at: string | null
  rank_label: string | null
}

export interface DonorAlert {
  id: string
  hospital_name: string
  blood_type: string
  quantity_units: number
  distance_km: number
  emergency_level: string
  video_url?: string
  created_at: string
}

export interface DonorAlertDetail {
  id: string
  hospital_name: string
  blood_type: string
  units_needed: number
  emergency_level: string
  /** Destination (hôpital) — toujours renseigné après normalisation API. */
  latitude: number
  longitude: number
  distance_km: number
  contact_phone: string
  created_at: string
  expires_at: string
  video_url?: string
}

/** Backend GET /donors/alerts/:id utilise hospital_lat / hospital_lng / quantity_units / hospital_phone. */
export function normalizeDonorAlertDetail(raw: unknown): DonorAlertDetail {
  const r = raw as Record<string, unknown>
  const lat = Number(r.latitude ?? r.hospital_lat)
  const lng = Number(r.longitude ?? r.hospital_lng)
  const units = Number(r.units_needed ?? r.quantity_units)
  const dist = Number(r.distance_km)
  const created = typeof r.created_at === 'string' ? r.created_at : ''
  const expiresRaw = typeof r.expires_at === 'string' ? r.expires_at : ''
  const phone =
    typeof r.contact_phone === 'string'
      ? r.contact_phone
      : typeof r.hospital_phone === 'string'
        ? r.hospital_phone
        : ''
  const emergency =
    typeof r.emergency_level === 'string' && r.emergency_level
      ? r.emergency_level
      : 'high'
  const video = typeof r.video_url === 'string' ? r.video_url : undefined

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordonnées de l'hôpital manquantes ou invalides")
  }

  let expiresAt = expiresRaw
  if (!expiresAt && created) {
    const t = new Date(created).getTime()
    if (!Number.isNaN(t)) {
      expiresAt = new Date(t + 120 * 60 * 1000).toISOString()
    } else {
      expiresAt = new Date(Date.now() + 120 * 60 * 1000).toISOString()
    }
  }
  if (!expiresAt) {
    expiresAt = new Date(Date.now() + 120 * 60 * 1000).toISOString()
  }

  return {
    id: String(r.id ?? ''),
    hospital_name: String(r.hospital_name ?? ''),
    blood_type: String(r.blood_type ?? ''),
    units_needed: Number.isFinite(units) && units > 0 ? units : 1,
    emergency_level: emergency,
    latitude: lat,
    longitude: lng,
    distance_km: Number.isFinite(dist) ? dist : 0,
    contact_phone: phone,
    created_at: created || new Date().toISOString(),
    expires_at: expiresAt,
    ...(video ? { video_url: video } : {}),
  }
}

export interface DonorHistoryItem {
  id?: string
  alert_id?: string
  hospital_name?: string
  blood_type?: string
  status?: string
  response_status?: string
  emergency_level?: string
  units_needed?: number
  distance_km?: number
  responded_at?: string
  updated_at?: string
  created_at?: string
  completed_at?: string
}

export const donor = {
  setStatus: (status: 'available' | 'unavailable' | 'busy') =>
    req<{ message: string }>(`${API}/donors/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),

  updateLocation: (latitude: number, longitude: number) =>
    req<{ message: string }>(`${API}/donors/location`, {
      method: 'PATCH',
      body: JSON.stringify({ latitude, longitude }),
    }),

  nearbyAlerts: () =>
    req<{ data: DonorAlert[] }>(`${API}/donors/nearby-alerts`),

  getAlert: async (id: string) => {
    const res = await req<{ data: unknown }>(`${API}/donors/alerts/${id}`)
    return normalizeDonorAlertDetail(res.data)
  },

  respond: (alert_id: string, accept: boolean) =>
    req<{ data: { message: string; response_id: string; confirmation_code: string; status: string } }>(`${API}/donors/respond`, {
      method: 'POST', body: JSON.stringify({ alert_id, accept }),
    }),

  history: () =>
    req<{ data: DonorHistoryItem[] }>(`${API}/donors/history`),

  stats: () =>
    req<{ data: DonorStats }>(`${API}/donors/stats`),
}

// ── Hospital ──────────────────────────────────────────────────────────────────
export const hospital = {
  createAlert: (payload: { blood_type: string; quantity_units: number; expires_in_hours: number; video?: File | null }) => {
    const fd = new FormData()
    fd.append('blood_type', payload.blood_type)
    fd.append('quantity_units', String(payload.quantity_units))
    fd.append('expires_in_hours', String(payload.expires_in_hours))
    if (payload.video) fd.append('video', payload.video)
    return req<{ data: unknown }>(`${API}/hospitals/alerts`, {
      method: 'POST', body: fd,
    })
  },

  getAlerts: () =>
    req<{ data: unknown[] }>(`${API}/hospitals/alerts`),

  getAlertStatus: (id: string) =>
    req<{ data: unknown }>(`${API}/hospitals/alerts/${id}/status`),

  completeAlert: (id: string) =>
    req<{ message: string }>(`${API}/hospitals/alerts/${id}/complete`, {
      method: 'PATCH',
    }),

  verifyDonor: (payload: { alert_id: string; donor_id?: string; confirmation_code?: string }) =>
    req<{ message: string }>(`${API}/hospitals/verify-donor`, {
      method: 'POST', body: JSON.stringify(payload),
    }),

  stats: () =>
    req<{ data: unknown }>(`${API}/hospitals/stats`),
}

// ── AI Service ────────────────────────────────────────────────────────────────
export interface ChatMessage { role: 'user' | 'assistant'; content: string }

export const ai = {
  chat: (message: string, history: ChatMessage[], donor_name: string, blood_type: string) =>
    fetch(`${AI}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, donor_name, blood_type }),
    }).then(r => r.json()) as Promise<{ reply: string; eligible: boolean | null }>,

  motivate: (donor_name: string, blood_type: string, hospital_name: string, distance_km: number, urgency = 'high') =>
    fetch(`${AI}/motivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donor_name, blood_type, hospital_name, distance_km, urgency }),
    }).then(r => r.json()) as Promise<{ title: string; body: string }>,
}
