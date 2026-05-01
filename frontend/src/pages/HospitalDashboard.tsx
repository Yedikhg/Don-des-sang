import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { hospital as hospitalApi } from '../services/api'
import {
  Zap,
  Users,
  Clock,
  CheckCircle,
  Upload,
  Video,
  QrCode,
  MapPin,
  Phone,
  Droplets,
  TrendingUp,
  AlertTriangle,
  X,
  Loader2,
  ChevronRight,
  LayoutDashboard,
  Bell,
  Settings,
  LogOut,
  Menu,
  History,
  BarChart3,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { MapContainer, Marker, Popup, TileLayer, CircleMarker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { BloodType } from '../types'

const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

type HospitalStats = {
  alerts_this_month: number
  active_alerts: number
  donors_in_radius: number
  donors_notified: number
  donors_responded: number
  donors_arrived: number
  series: Array<{ day: string; reponses: number; dons: number }>
}

type HospitalAlert = {
  id: string
  blood_type: string
  quantity_units: number
  video_url?: string
  status: string
  created_at?: string
  completed_at?: string | null
}

type AlertStatusResponseRow = {
  donor_id: string
  donor_name: string
  blood_type: string
  status: 'en_route' | 'completed'
  latitude: number
  longitude: number
  distance_km: number
  eta_minutes: number
}

const hospitalIcon = L.divIcon({
  className: 'custom-div-icon',
  html: '<div style="background:#dc2626;width:14px;height:14px;border-radius:9999px;border:3px solid #fff;box-shadow:0 0 0 2px #dc2626;"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

type MapFitPoint = { lat: number; lng: number }

function DonEnCoursMapFitBounds({
  hospital,
  donors,
}: {
  hospital: [number, number] | null
  donors: MapFitPoint[]
}) {
  const map = useMap()

  useEffect(() => {
    const validDonors = donors.filter(
      (d) =>
        Number.isFinite(d.lat) &&
        Number.isFinite(d.lng) &&
        !(d.lat === 0 && d.lng === 0),
    )
    const hasHosp =
      hospital != null &&
      Number.isFinite(hospital[0]) &&
      Number.isFinite(hospital[1]) &&
      !(hospital[0] === 0 && hospital[1] === 0)

    const bounds = L.latLngBounds([])
    if (hasHosp) bounds.extend(hospital)
    for (const d of validDonors) bounds.extend([d.lat, d.lng])

    if (!bounds.isValid()) return

    const n = (hasHosp ? 1 : 0) + validDonors.length
    if (n === 1) {
      const c: [number, number] = hasHosp ? hospital! : [validDonors[0].lat, validDonors[0].lng]
      map.setView(c, 13)
      return
    }

    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: true })
  }, [map, hospital, donors])

  return null
}

export default function HospitalDashboard() {
  const navigate = useNavigate()
  const { currentUser, logout, token, userType } = useApp()
  const [currentView, setCurrentView] = useState<'dashboard' | 'in_progress' | 'history' | 'stats' | 'settings'>('dashboard')
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alertForm, setAlertForm] = useState({ bloodType: 'O-' as BloodType, quantity: '1', expiresIn: '2', message: '' })
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [launching, setLaunching] = useState(false)
  const [stats, setStats] = useState<HospitalStats | null>(null)
  const [alerts, setAlerts] = useState<HospitalAlert[]>([])
  const [activeAlert, setActiveAlert] = useState<HospitalAlert | null>(null)
  const [responses, setResponses] = useState<AlertStatusResponseRow[]>([])
  const [qrDonorId, setQrDonorId] = useState<string | null>(null)
  const [manualDonorId, setManualDonorId] = useState('')
  const [scannerStatus, setScannerStatus] = useState<string>('Initialisation caméra...')
  const [scannerReady, setScannerReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanRafRef = useRef<number | null>(null)
  const scanBusyRef = useRef(false)

  const hospitalMapPoint = useMemo((): [number, number] | null => {
    if (currentUser?.latitude == null || currentUser?.longitude == null) return null
    const lat = Number(currentUser.latitude)
    const lng = Number(currentUser.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return [lat, lng]
  }, [currentUser?.latitude, currentUser?.longitude])

  const donorsWithValidCoords = useMemo(
    () =>
      responses.filter(
        (d) => Number.isFinite(Number(d.latitude)) && Number.isFinite(Number(d.longitude)),
      ),
    [responses],
  )

  const donorMapPoints = useMemo(
    () =>
      donorsWithValidCoords.map((d) => ({
        lat: Number(d.latitude),
        lng: Number(d.longitude),
      })),
    [donorsWithValidCoords],
  )

  const refresh = async () => {
    if (!token) return
    try {
      const [s, a] = await Promise.all([
        hospitalApi.stats(),
        hospitalApi.getAlerts(),
      ])
      setStats(s.data as HospitalStats)
      const list = (a.data ?? []) as HospitalAlert[]
      setAlerts(list)
      const activeList = list.filter(x => x.status === 'active')
      if (activeList.length === 0) {
        setActiveAlert(null)
        setResponses([])
        return
      }

      // If multiple active alerts exist, prioritize the one that already has
      // donor responses so hospitals don't miss donors en route on older active alerts.
      const statuses = await Promise.all(
        activeList.map(async (al) => {
          try {
            const st = await hospitalApi.getAlertStatus(al.id)
            const payload = st.data as { alert: unknown; responses: unknown }
            const responses = ((payload as any).responses ?? []) as AlertStatusResponseRow[]
            return { alert: al, responses }
          } catch {
            return { alert: al, responses: [] as AlertStatusResponseRow[] }
          }
        })
      )

      const withResponses = statuses
        .filter(x => x.responses.length > 0)
        .sort((a, b) => b.responses.length - a.responses.length)

      const picked = withResponses[0] ?? statuses[0]
      setActiveAlert(picked.alert)
      setResponses(picked.responses)
    } catch (err) {
      // Most common reason: token expired or missing. Route guard should handle missing token,
      // but keep a safe fallback to avoid console spam.
      const msg = (err as Error)?.message ?? ''
      if (msg.toLowerCase().includes('authorization') || msg.includes('401')) {
        toast.error('Session expirée. Merci de vous reconnecter.')
        logout()
        navigate('/login')
        return
      }
    }
  }

  useEffect(() => {
    // Extra safety (route is already protected in App.tsx)
    if (!token) return
    if (userType && userType !== 'hospital') {
      navigate('/')
      return
    }
    refresh()
  }, [token, userType])

  useEffect(() => {
    // Lightweight polling so hospitals see donors "en route" quickly.
    // Only useful when an alert is active.
    if (!token) return
    const t = setInterval(() => {
      void refresh()
    }, 5000)
    return () => clearInterval(t)
  }, [token])

  const handleLaunchAlert = async () => {
    setLaunching(true)
    try {
      await hospitalApi.createAlert({
        blood_type: alertForm.bloodType,
        quantity_units: parseInt(alertForm.quantity),
        expires_in_hours: parseInt(alertForm.expiresIn),
        video: videoFile,
      })
      setShowAlertModal(false)
      toast.success(`Alerte lancée ! Les donneurs ${alertForm.bloodType} proches ont été notifiés.`)
      setVideoFile(null)
      await refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Erreur lors du lancement de l'alerte")
    } finally {
      setLaunching(false)
    }
  }

  const handleVerifyDonor = async (donorId: string) => {
    if (!activeAlert) {
      toast.error("Aucune alerte active")
      return
    }
    try {
      await hospitalApi.verifyDonor({ donor_id: donorId, alert_id: activeAlert.id })
      setQrDonorId(donorId)
      setShowQRModal(false)
      toast.success(`Arrivée du donneur confirmée.`)
      await refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Erreur lors de la vérification")
    }
  }

  const handleManualVerify = async () => {
    const value = manualDonorId.trim()
    if (!value) {
      toast.error('Veuillez saisir un ID donneur ou un code')
      return
    }
    if (!activeAlert) {
      toast.error("Aucune alerte active")
      return
    }
    try {
      await hospitalApi.verifyDonor({
        alert_id: activeAlert.id,
        // Accept either donor UUID or short confirmation code
        donor_id: value.includes('-') ? value : undefined,
        confirmation_code: value.includes('-') ? undefined : value,
      })
      setShowQRModal(false)
      setManualDonorId('')
      toast.success(`Arrivée du donneur confirmée.`)
      await refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Erreur lors de la vérification")
    }
  }

  const stopScanner = () => {
    if (scanRafRef.current) {
      cancelAnimationFrame(scanRafRef.current)
      scanRafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setScannerReady(false)
  }

  const applyScannedPayload = async (raw: string) => {
    if (!activeAlert || scanBusyRef.current) return
    scanBusyRef.current = true
    try {
      let confirmationCode: string | undefined
      let donorId: string | undefined
      try {
        const parsed = JSON.parse(raw) as { confirmation_code?: string; donor_id?: string }
        confirmationCode = parsed?.confirmation_code
        donorId = parsed?.donor_id
      } catch {
        // If QR is plain text, consider it as confirmation code.
        confirmationCode = raw
      }

      if (!confirmationCode && !donorId) {
        toast.error('QR invalide: code de confirmation introuvable')
        return
      }

      setScannerStatus('QR détecté, confirmation en cours...')
      await hospitalApi.verifyDonor({
        alert_id: activeAlert.id,
        donor_id: donorId,
        confirmation_code: confirmationCode,
      })
      toast.success('Arrivée du donneur confirmée via QR.')
      setShowQRModal(false)
      setManualDonorId('')
      await refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Erreur de validation du QR')
      setScannerStatus('Échec de confirmation QR, réessayez ou utilisez la saisie manuelle.')
    } finally {
      scanBusyRef.current = false
    }
  }

  useEffect(() => {
    if (!showQRModal) {
      stopScanner()
      return
    }

    let cancelled = false
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setScannerStatus("Caméra non supportée, utilisez la saisie manuelle.")
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setScannerReady(true)

        const BarcodeDetectorCtor = (window as any).BarcodeDetector
        if (!BarcodeDetectorCtor) {
          setScannerStatus("Scanner QR natif indisponible, utilisez la saisie manuelle.")
          return
        }

        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] })
        setScannerStatus('Pointez vers le QR code du donneur...')

        const tick = async () => {
          if (cancelled || !videoRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes?.length) {
              const value = barcodes[0]?.rawValue
              if (value) {
                await applyScannedPayload(value)
                return
              }
            }
          } catch {
            // keep scanning
          }
          scanRafRef.current = requestAnimationFrame(tick)
        }
        scanRafRef.current = requestAnimationFrame(tick)
      } catch {
        setScannerStatus("Impossible d'accéder à la caméra, utilisez la saisie manuelle.")
      }
    }

    void start()
    return () => {
      cancelled = true
      stopScanner()
    }
  }, [showQRModal, activeAlert?.id])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
            <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Urgence-Sang</h1>
              <p className="text-xs text-gray-500">Espace Hôpital</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                currentView === 'dashboard' 
                  ? 'text-white bg-red-600 shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Tableau de bord
            </button>
            <button
              onClick={() => setCurrentView('in_progress')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                currentView === 'in_progress'
                  ? 'text-white bg-red-600 shadow-md'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200'
              }`}
            >
              <MapPin className="w-5 h-5" />
              Don en cours
            </button>
            <button 
              onClick={() => setCurrentView('history')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                currentView === 'history' 
                  ? 'text-white bg-red-600 shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200'
              }`}
            >
              <History className="w-5 h-5" />
              Historique
            </button>
            <button 
              onClick={() => setCurrentView('stats')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                currentView === 'stats' 
                  ? 'text-white bg-red-600 shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Statistiques
            </button>
            <button 
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                currentView === 'settings' 
                  ? 'text-white bg-red-600 shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200'
              }`}
            >
              <Settings className="w-5 h-5" />
              Paramètres
            </button>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm">
                {currentUser?.first_name?.[0] || 'H'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{currentUser?.first_name || 'Hôpital'}</p>
                <p className="text-xs text-gray-600 truncate">{currentUser?.email}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 active:bg-red-100 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Bienvenue, {currentUser?.first_name || 'Hôpital'}</h2>
                  <p className="text-sm text-gray-500">Vue d'ensemble de votre activité</p>
                </div>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Vérifié
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => toast.info('Aucune nouvelle notification')}
                className="relative p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-all duration-200 hover:scale-105"
              >
                <Bell className="w-5 h-5 text-gray-600 hover:text-gray-900 transition-colors" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
              </button>
              <button
                onClick={() => setShowAlertModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Nouvelle alerte</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === 'dashboard' && (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { 
                    label: 'Alertes ce mois', 
                    value: stats?.alerts_this_month ?? 0, 
                    icon: Zap, 
                    color: stats?.alerts_this_month ? 'text-red-600' : 'text-gray-600',
                    bg: stats?.alerts_this_month ? 'bg-red-50' : 'bg-gray-50'
                  },
                  { 
                    label: 'Donneurs notifiés', 
                    value: stats?.donors_notified ?? 0, 
                    icon: Users, 
                    color: stats?.donors_notified ? 'text-blue-600' : 'text-gray-600',
                    bg: stats?.donors_notified ? 'bg-blue-50' : 'bg-gray-50'
                  },
                  {
                    label: 'Taux de conversion',
                    value: `${stats && stats.donors_notified > 0 ? Math.round((stats.donors_arrived / stats.donors_notified) * 100) : 0}%`,
                    icon: TrendingUp,
                    color: stats && stats.donors_notified > 0 ? 'text-emerald-600' : 'text-gray-600',
                    bg: stats && stats.donors_notified > 0 ? 'bg-emerald-50' : 'bg-gray-50',
                  },
                  { 
                    label: 'Arrivées confirmées', 
                    value: stats?.donors_arrived ?? 0, 
                    icon: CheckCircle, 
                    color: stats?.donors_arrived ? 'text-emerald-600' : 'text-gray-600',
                    bg: stats?.donors_arrived ? 'bg-emerald-50' : 'bg-gray-50'
                  },
                ].map((kpi) => {
                  const Icon = kpi.icon
                  return (
                    <div
                      key={kpi.label}
                      className="bg-white rounded-lg p-5 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${kpi.color}`} />
                        </div>
                      </div>
                      <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                      <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
                    </div>
                  )
                })}
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Active alert */}
                  {activeAlert && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <h3 className="font-bold text-red-900">Alerte active</h3>
                        </div>
                        <span className="text-sm text-red-600 font-medium">
                          {responses.length} réponse(s)
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 border border-red-100">
                          <Droplets className="w-4 h-4 text-red-600" />
                          <span className="font-bold text-red-700">{activeAlert.blood_type}</span>
                        </div>
                        <div className="text-gray-700 text-sm">
                          <span className="font-semibold">{activeAlert.quantity_units}</span> poche(s) requise(s)
                        </div>
                      </div>

                      <button
                        onClick={() => setShowQRModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                        Scanner l'arrivée
                      </button>
                    </div>
                  )}

                  {/* Donors en route */}
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between p-5 border-b border-gray-200">
                      <h3 className="font-bold text-gray-900">Donneurs en route</h3>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                        {responses.length}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {responses.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-gray-500">
                          Aucun donneur en route pour le moment.
                        </div>
                      ) : (
                        responses.map((donor) => (
                          <div key={donor.donor_id} className="flex items-center gap-4 px-5 py-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                              donor.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {donor.donor_name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm">{donor.donor_name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded font-semibold">
                                  {donor.blood_type}
                                </span>
                              </div>
                            </div>
                            {donor.status === 'completed' && (
                              <CheckCircle className="w-5 h-5 text-emerald-500" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-1">Activité hebdomadaire</h3>
                    <p className="text-sm text-gray-500 mb-4">Réponses et dons effectifs</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={(stats?.series ?? [])} barSize={12} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                        />
                        <Bar dataKey="reponses" name="Réponses" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="dons" name="Dons" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                  {/* Recent alerts */}
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-bold text-gray-900">Alertes récentes</h3>
                    </div>
                    {alerts.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">
                        Aucune alerte pour le moment.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {alerts.slice(0, 5).map((alert) => (
                          <div key={alert.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-600 text-xs font-bold">
                              {alert.blood_type}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700 truncate">{alert.id.slice(0, 8)}...</p>
                              <p className="text-xs text-gray-500">{alert.quantity_units} poche(s)</p>
                            </div>
                            {alert.status === 'completed' ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {currentView === 'in_progress' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Don en cours</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Suivi en direct des donneurs ayant repondu a l'alerte active
                </p>
              </div>

              {!activeAlert ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
                  Aucune alerte active pour le moment.
                </div>
              ) : (
                <div className="grid lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-bold text-gray-900">Donneurs repondants</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {responses.length} donneur(s) pour l'alerte {activeAlert.blood_type}
                      </p>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
                      {responses.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                          Aucun donneur n'a encore repondu a cette alerte.
                        </div>
                      ) : (
                        responses.map((donor) => (
                          <div key={donor.donor_id} className="px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">{donor.donor_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-semibold">
                                    {donor.blood_type}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {donor.distance_km?.toFixed(1) ?? '0.0'} km
                                  </span>
                                </div>
                              </div>
                              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                donor.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}>
                                {donor.status === 'completed' ? 'Arrive' : `ETA ${donor.eta_minutes} min`}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-bold text-gray-900">Position des donneurs</h3>
                      <p className="text-xs text-gray-500 mt-1">Mise a jour automatique toutes les 5 secondes</p>
                    </div>
                    <div className="h-[520px]">
                      <MapContainer
                        center={[
                          Number(
                            currentUser?.latitude ??
                              donorsWithValidCoords[0]?.latitude ??
                              33.5731,
                          ),
                          Number(
                            currentUser?.longitude ??
                              donorsWithValidCoords[0]?.longitude ??
                              -7.5898,
                          ),
                        ]}
                        zoom={12}
                        scrollWheelZoom
                        className="h-full w-full"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <DonEnCoursMapFitBounds hospital={hospitalMapPoint} donors={donorMapPoints} />
                        {currentUser?.latitude != null && currentUser?.longitude != null && (
                          <Marker
                            position={[Number(currentUser.latitude), Number(currentUser.longitude)]}
                            icon={hospitalIcon}
                          >
                            <Popup>Votre hopital (position de l'alerte)</Popup>
                          </Marker>
                        )}
                        {donorsWithValidCoords.map((donor) => {
                          const hospitalLat = Number(currentUser?.latitude ?? 0)
                          const hospitalLng = Number(currentUser?.longitude ?? 0)
                          const donorLat = Number(donor.latitude)
                          const donorLng = Number(donor.longitude)
                          return (
                            <Fragment key={donor.donor_id}>
                              {currentUser?.latitude != null && currentUser?.longitude != null && (
                                <Polyline
                                  positions={[
                                    [hospitalLat, hospitalLng],
                                    [donorLat, donorLng],
                                  ]}
                                  pathOptions={{
                                    color: donor.status === 'completed' ? '#059669' : '#2563eb',
                                    weight: 3,
                                    opacity: 0.65,
                                    dashArray: donor.status === 'completed' ? undefined : '8 6',
                                  }}
                                />
                              )}
                              <CircleMarker
                                center={[donorLat, donorLng]}
                                radius={8}
                                pathOptions={{
                                  color: donor.status === 'completed' ? '#059669' : '#2563eb',
                                  fillColor: donor.status === 'completed' ? '#10b981' : '#3b82f6',
                                  fillOpacity: 0.7,
                                }}
                              >
                                <Popup>
                                  <div className="text-sm">
                                    <p className="font-semibold">{donor.donor_name}</p>
                                    <p>Groupe: {donor.blood_type}</p>
                                    <p>Distance: {donor.distance_km?.toFixed(1) ?? '0.0'} km</p>
                                    <p>{donor.status === 'completed' ? 'Statut: Arrive' : `ETA: ${donor.eta_minutes} min`}</p>
                                  </div>
                                </Popup>
                              </CircleMarker>
                            </Fragment>
                          )
                        })}
                      </MapContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentView === 'history' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Historique des alertes</h2>
                <p className="text-sm text-gray-500 mt-1">Toutes vos alertes passées et leur statut</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Groupe</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Quantité</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Réponses</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Statut</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {alerts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                            Aucune alerte dans l'historique
                          </td>
                        </tr>
                      ) : (
                        alerts.map((alert) => (
                          <tr key={alert.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {alert.created_at ? new Date(alert.created_at).toLocaleDateString('fr-FR', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded">
                                {alert.blood_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{alert.quantity_units} poche(s)</td>
                            <td className="px-6 py-4 text-sm text-gray-900">-</td>
                            <td className="px-6 py-4">
                              {alert.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded">
                                  <CheckCircle className="w-3 h-3" />
                                  Complété
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded">
                                  <Clock className="w-3 h-3" />
                                  Actif
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 font-mono">{alert.id.slice(0, 8)}...</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentView === 'stats' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Statistiques détaillées</h2>
                <p className="text-sm text-gray-500 mt-1">Analyse approfondie de votre activité</p>
              </div>

              {/* Extended KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Total alertes', value: alerts.length, icon: Zap, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Alertes complétées', value: alerts.filter(a => a.status === 'completed').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Alertes actives', value: alerts.filter(a => a.status === 'active').length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Donneurs dans rayon', value: stats?.donors_in_radius ?? 0, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Donneurs notifiés', value: stats?.donors_notified ?? 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Donneurs arrivés', value: stats?.donors_arrived ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((kpi) => {
                  const Icon = kpi.icon
                  return (
                    <div key={kpi.label} className="bg-white rounded-lg p-5 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${kpi.color}`} />
                        </div>
                      </div>
                      <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                      <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
                    </div>
                  )
                })}
              </div>

              {/* Large Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-1 text-lg">Évolution hebdomadaire</h3>
                <p className="text-sm text-gray-500 mb-6">Comparaison réponses vs dons effectifs</p>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={(stats?.series ?? [])} barSize={20} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                    />
                    <Bar dataKey="reponses" name="Réponses" fill="#93c5fd" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="dons" name="Dons effectifs" fill="#dc2626" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Blood type distribution */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Répartition par groupe sanguin</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {bloodTypes.map((type) => {
                    const count = alerts.filter(a => a.blood_type === type).length
                    return (
                      <div key={type} className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-red-700 font-bold">{type}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                        <p className="text-xs text-gray-500 mt-1">alertes</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Paramètres</h2>
                <p className="text-sm text-gray-500 mt-1">Gérez les informations de votre établissement</p>
              </div>

              {/* Hospital Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Informations de l'hôpital</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom de l'établissement</label>
                    <input
                      type="text"
                      value={currentUser?.first_name || ''}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={currentUser?.phone || ''}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Notifications</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Notifications par email', desc: 'Recevoir les alertes par email' },
                    { label: 'Notifications push', desc: 'Recevoir les notifications dans le navigateur' },
                    { label: 'Résumé quotidien', desc: 'Recevoir un résumé quotidien de l\'activité' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-lg border border-red-200 p-6">
                <h3 className="font-bold text-red-900 mb-2">Zone dangereuse</h3>
                <p className="text-sm text-gray-600 mb-4">Actions irréversibles sur votre compte</p>
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  Supprimer le compte
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Launch Alert Modal */}
      <AnimatePresence>
        {showAlertModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowAlertModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-rose-600 text-white">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  <h3 className="font-black text-lg">Nouvelle alerte urgente</h3>
                </div>
                <button onClick={() => setShowAlertModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Blood type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Groupe sanguin requis *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {bloodTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setAlertForm({ ...alertForm, bloodType: type })}
                        className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                          alertForm.bloodType === type
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-rose-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de poches</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={alertForm.quantity}
                    onChange={(e) => setAlertForm({ ...alertForm, quantity: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Expiration de l'alerte</label>
                  <select
                    value={alertForm.expiresIn}
                    onChange={(e) => setAlertForm({ ...alertForm, expiresIn: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="1">Expire dans 1 heure</option>
                    <option value="2">Expire dans 2 heures</option>
                    <option value="4">Expire dans 4 heures</option>
                    <option value="8">Expire dans 8 heures</option>
                    <option value="24">Expire dans 24 heures</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message d'urgence</label>
                  <textarea
                    rows={2}
                    value={alertForm.message}
                    onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
                    placeholder="ex: Patient en chirurgie, urgence vitale..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                  />
                </div>

                {/* Video upload */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Video className="w-4 h-4" />
                    Vidéo de motivation (15-30s)
                  </label>
                  <label className="flex flex-col items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-rose-300 hover:bg-rose-50 transition-all">
                    {videoFile ? (
                      <div className="text-center px-4 w-full">
                        <p className="text-sm font-medium text-slate-700 truncate">{videoFile.name}</p>
                        <p className="text-xs text-emerald-600 mt-1 flex items-center justify-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Vidéo prête
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-300" />
                        <span className="text-sm text-slate-400">Cliquez pour uploader une vidéo</span>
                        <span className="text-xs text-slate-300">MP4, MOV · Max 50 Mo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                      id="video-upload"
                    />
                  </label>
                </div>

                <button
                  onClick={handleLaunchAlert}
                  disabled={launching}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-black text-lg rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  {launching ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours...</>
                  ) : (
                    <><Zap className="w-5 h-5" /> Lancer l'alerte maintenant</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-3xl overflow-hidden w-full max-w-sm"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white">
                  <QrCode className="w-5 h-5" />
                  <h3 className="font-bold">Scanner QR Code Donneur</h3>
                </div>
                <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Real camera QR scanner */}
              <div className="relative bg-slate-950 h-64 flex items-center justify-center overflow-hidden">
                <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover opacity-90" playsInline muted />
                <div className="w-48 h-48 border-2 border-white/30 rounded-2xl relative z-10">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-rose-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-rose-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-rose-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-rose-500 rounded-br-lg" />
                  {scannerReady && (
                    <motion.div
                      animate={{ y: [0, 176, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      className="absolute left-0 right-0 h-0.5 bg-rose-500/70"
                    />
                  )}
                </div>
                <p className="absolute bottom-4 text-slate-300 text-sm z-10 px-2 text-center">{scannerStatus}</p>
              </div>

              {/* Simulate scan buttons */}
              <div className="p-4 space-y-2">
                <p className="text-slate-400 text-xs text-center mb-3">Simuler une validation manuelle :</p>
                {responses.filter(d => d.status !== 'completed').map((d) => (
                  <button
                    key={d.donor_id}
                    onClick={() => handleVerifyDonor(d.donor_id)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <div className="w-8 h-8 bg-rose-500/20 rounded-lg flex items-center justify-center text-rose-400 text-xs font-bold">
                      {d.blood_type}
                    </div>
                    <span className="text-white text-sm font-medium">{d.donor_name}</span>
                    <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
                  </button>
                ))}

                {/* Explicit manual fallback without QR scan */}
                <div className="pt-3 border-t border-slate-800 mt-3">
                  <p className="text-slate-400 text-xs mb-2">
                    Confirmer sans scanner (ID donneur ou code)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualDonorId}
                      onChange={(e) => setManualDonorId(e.target.value)}
                      placeholder="ex: 15f6aa3f-... ou 9A3F1C2D"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      onClick={() => void handleManualVerify()}
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
