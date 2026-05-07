import { useEffect, useState, useMemo } from 'react'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { pushDonorGpsToServer } from '../lib/donorLocationSync'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { donor as donorApi, type DonorHistoryItem, type DonorStats } from '../services/api'
import {
  Droplets,
  LayoutDashboard,
  History,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Bell,
  HeartPulse,
  Users,
  TrendingUp,
  Award,
  CalendarClock,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Target,
  Navigation,
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getDaysUntilEligible(nextEligibleAt: string | null | undefined): number | null {
  if (!nextEligibleAt) return null
  const date = new Date(nextEligibleAt)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function DonorDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentUser, logout } = useApp()
  const [currentView, setCurrentView] = useState<'dashboard' | 'history' | 'stats' | 'settings'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState<DonorStats | null>(null)
  const [history, setHistory] = useState<DonorHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDonationAlertId, setActiveDonationAlertId] = useState<string | null>(null)

  async function checkUrgentAlerts() {
    try {
      const res = await donorApi.nearbyAlerts()
      const list = Array.isArray(res.data) ? (res.data as any[]) : []
      if (list.length === 0) return

      // Pick nearest first (API already sorts by distance_km)
      const top = list[0]
      const alertId = String(top?.id ?? '')
      if (!alertId) return

      const key = 'last_seen_alert_id'
      const lastSeen = sessionStorage.getItem(key)
      if (lastSeen === alertId) return
      sessionStorage.setItem(key, alertId)

      toast.error(t('donor_dashboard.urgent_alert_nearby', { bloodType: top?.blood_type ?? '' }), {
        description: t('donor_dashboard.tap_to_open_details'),
        duration: 8000,
        action: {
          label: t('donor_dashboard.view'),
          onClick: () => navigate(`/alert/${alertId}`),
        },
      })
    } catch {
      // silent: don't spam the user
    }
  }

  const responseRate = stats && stats.alerts_received > 0 
    ? Math.round((stats.responses_accepted / stats.alerts_received) * 100) 
    : 0

  const daysUntilNext = getDaysUntilEligible(stats?.next_eligible_at)

  const weeklyChartData = useMemo(() => {
    const days = [t('donor_dashboard.sun'), t('donor_dashboard.mon'), t('donor_dashboard.tue'), t('donor_dashboard.wed'), t('donor_dashboard.thu'), t('donor_dashboard.fri'), t('donor_dashboard.sat')]
    const data = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return { day: days[d.getDay()], dateStr: d.toISOString().split('T')[0], alertes: 0, reponses: 0 }
    })

    history.forEach(h => {
      const dStr = h.created_at || ''
      if (dStr) {
        const d = new Date(dStr)
        if (!Number.isNaN(d.getTime())) {
          const itemDateStr = d.toISOString().split('T')[0]
          const dataPoint = data.find(x => x.dateStr === itemDateStr)
          if (dataPoint) {
            dataPoint.alertes += 1
            if (h.status === 'en_route' || h.status === 'completed' || h.status === 'accepted') {
              dataPoint.reponses += 1
            }
          }
        }
      }
    })
    return data
  }, [history])

  const monthlyChartData = useMemo(() => {
    const months = [t('donor_dashboard.jan'), t('donor_dashboard.feb'), t('donor_dashboard.mar'), t('donor_dashboard.apr'), t('donor_dashboard.may'), t('donor_dashboard.jun'), t('donor_dashboard.jul'), t('donor_dashboard.aug'), t('donor_dashboard.sep'), t('donor_dashboard.oct'), t('donor_dashboard.nov'), t('donor_dashboard.dec')]
    const data = Array.from({ length: 4 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (3 - i))
      return { 
        mois: months[d.getMonth()],
        monthKey: `${d.getFullYear()}-${d.getMonth()}`,
        alertes: 0, 
        reponses: 0 
      }
    })
    
    history.forEach(h => {
      const dStr = h.created_at || ''
      if (dStr) {
        const d = new Date(dStr)
        if (!Number.isNaN(d.getTime())) {
          const itemKey = `${d.getFullYear()}-${d.getMonth()}`
          const dataPoint = data.find(x => x.monthKey === itemKey)
          if (dataPoint) {
            dataPoint.alertes += 1
            if (h.status === 'en_route' || h.status === 'completed' || h.status === 'accepted') {
              dataPoint.reponses += 1
            }
          }
        }
      }
    })
    return data
  }, [history])

  const derniereDonationText = stats?.last_donation_at
    ? formatDateTime(stats.last_donation_at)
    : (stats?.donation_count && stats.donation_count > 0)
    ? t('donor_dashboard.previous_data')
    : t('donor_dashboard.no_donation_recorded')

  const prochainDonText = stats?.next_eligible_at
    ? formatDateTime(stats.next_eligible_at)
    : (stats?.donation_count && stats.donation_count > 0)
    ? t('donor_dashboard.available_now')
    : '-'

  async function loadDashboard() {
    console.log('[DonorDashboard] Loading dashboard...')
    console.log('[DonorDashboard] Token in localStorage:', localStorage.getItem('token')?.substring(0, 20) + '...')
    setLoading(true)
    try {
      const [statsRes, historyRes] = await Promise.all([
        donorApi.stats(),
        donorApi.history(),
      ])
      console.log('[DonorDashboard] Stats received:', statsRes)
      console.log('[DonorDashboard] History received:', historyRes)
      setStats(statsRes.data)
      const historyList: DonorHistoryItem[] = Array.isArray(historyRes.data) ? historyRes.data : []
      setHistory(historyList)

      // Keep temporary "don en cours" shortcut until hospital confirms completion.
      const raw = localStorage.getItem('active_donation_context')
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { alert_id?: string }
          const alertId = parsed?.alert_id
          if (alertId) {
            const completed = historyList.some(
              (h) =>
                h.alert_id === alertId &&
                (h.status === 'completed' || h.response_status === 'completed')
            )
            if (completed) {
              localStorage.removeItem('active_donation_context')
              localStorage.removeItem(`confirmation_code_${alertId}`)
              setActiveDonationAlertId(null)
            } else {
              setActiveDonationAlertId(alertId)
            }
          }
        } catch {
          setActiveDonationAlertId(null)
        }
      } else {
        setActiveDonationAlertId(null)
      }
    } catch (err: unknown) {
      console.error('[DonorDashboard] Error loading:', err)
      toast.error((err as Error).message ?? t('donor_dashboard.loading_error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    // Lightweight polling to "alert" donors quickly (no realtime infra yet).
    void checkUrgentAlerts()
    const t = setInterval(() => void checkUrgentAlerts(), 10000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!activeDonationAlertId || !navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        void pushDonorGpsToServer(pos.coords.latitude, pos.coords.longitude)
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 12000, timeout: 25000 },
    )
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void pushDonorGpsToServer(pos.coords.latitude, pos.coords.longitude, { force: true })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [activeDonationAlertId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('donor_dashboard.loading')}...</p>
        </div>
      </div>
    )
  }

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
              <p className="text-xs text-gray-500">{t('donor_dashboard.space')}</p>
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
              {t('donor_dashboard.dashboard')}
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
              {t('donor_dashboard.history')}
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
              {t('donor_dashboard.stats')}
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
              {t('donor_dashboard.settings')}
            </button>
            {activeDonationAlertId && (
              <button
                onClick={() => navigate(`/donor/navigation/${activeDonationAlertId}`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200"
              >
                <Navigation className="w-5 h-5" />
                {t('donor_dashboard.active_donation')}
              </button>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm">
                {currentUser?.first_name?.[0] || 'D'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{currentUser?.first_name || 'Donneur'}</p>
                <p className="text-xs text-gray-600 truncate">{currentUser?.email}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 active:bg-red-100 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              {t('donor_dashboard.logout')}
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
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-all duration-200 shrink-0"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">{t('donor_dashboard.welcome')} {currentUser?.first_name || 'Donneur'}</h2>
                <p className="text-xs sm:text-sm text-gray-500">{t('donor_dashboard.blood_type')} <span className="font-semibold text-red-600">{currentUser?.blood_type || '-'}</span></p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                {t('donor_dashboard.active')}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <LanguageSwitcher className="text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg shrink-0" />
              <button 
                onClick={() => toast.info(t('donor_dashboard.no_notifications'))}
                className="relative p-2 sm:p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-all duration-200 hover:scale-105 shrink-0"
              >
                <Bell className="w-5 h-5 text-gray-600 hover:text-gray-900 transition-colors" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
              </button>
              <button
                onClick={() => navigate('/donor/nearby-alerts')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 shrink-0"
              >
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">{t('donor_dashboard.available_alerts')}</span>
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
                    label: t('donor_dashboard.kpi.donations'), 
                    value: stats?.completed_donations ?? 0, 
                    icon: HeartPulse, 
                    color: stats?.completed_donations ? 'text-red-600' : 'text-gray-600',
                    bg: stats?.completed_donations ? 'bg-red-50' : 'bg-gray-50'
                  },
                  { 
                    label: t('donor_dashboard.kpi.impact'), 
                    value: stats?.lives_impacted ?? 0, 
                    icon: Users, 
                    color: stats?.lives_impacted ? 'text-blue-600' : 'text-gray-600',
                    bg: stats?.lives_impacted ? 'bg-blue-50' : 'bg-gray-50'
                  },
                  {
                    label: t('donor_dashboard.kpi.response_rate'),
                    value: `${responseRate}%`,
                    icon: TrendingUp,
                    color: responseRate > 0 ? 'text-emerald-600' : 'text-gray-600',
                    bg: responseRate > 0 ? 'bg-emerald-50' : 'bg-gray-50',
                  },
                  { 
                    label: t('donor_dashboard.kpi.impact_score'), 
                    value: stats?.impact_score ?? 0, 
                    icon: Award, 
                    color: stats?.impact_score ? 'text-amber-600' : 'text-gray-600',
                    bg: stats?.impact_score ? 'bg-amber-50' : 'bg-gray-50'
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
                  {/* Next donation */}
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <CalendarClock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{t('donor_dashboard.next_donation')}</h3>
                        <p className="text-sm text-gray-500">
                          {daysUntilNext === null ? t('donor_dashboard.no_data') : daysUntilNext === 0 ? t('donor_dashboard.available_now') : t('donor_dashboard.in_days', { days: daysUntilNext })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">{t('donor_dashboard.last_donation')}</p>
                        <p className="text-sm font-semibold text-gray-900">{derniereDonationText}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('donor_dashboard.next_possible_donation')}</p>
                        <p className="text-sm font-semibold text-gray-900">{prochainDonText}</p>
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-1">{t('donor_dashboard.weekly_activity')}</h3>
                    <p className="text-sm text-gray-500 mb-4">{t('donor_dashboard.alerts_and_responses')}</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={weeklyChartData} barSize={12} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                        />
                        <Bar dataKey="alertes" name={t('donor_dashboard.chart_alerts')} fill="#93c5fd" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="reponses" name={t('donor_dashboard.chart_responses')} fill="#dc2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                  {/* Stats summary */}
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4">{t('donor_dashboard.summary')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('donor_dashboard.alerts_received')}</span>
                        <span className="text-sm font-semibold text-gray-900">{stats?.alerts_received ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('donor_dashboard.accepted')}</span>
                        <span className="text-sm font-semibold text-emerald-600">{stats?.responses_accepted ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('donor_dashboard.declined')}</span>
                        <span className="text-sm font-semibold text-gray-600">{stats?.responses_declined ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-sm text-gray-600">{t('donor_dashboard.completed_donations')}</span>
                        <span className="text-sm font-semibold text-red-600">{stats?.completed_donations ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rank */}
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                        <Award className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('donor_dashboard.ranking')}</p>
                        <h3 className="text-lg font-bold text-gray-900">{stats?.rank_label || t('donor_dashboard.unranked')}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentView === 'history' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('donor_dashboard.responses_history')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('donor_dashboard.responses_history_desc')}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('donor_dashboard.table_date')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('donor_dashboard.table_hospital')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('donor_dashboard.table_group')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('donor_dashboard.table_distance')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{t('donor_dashboard.table_status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                            {t('donor_dashboard.no_history')}
                          </td>
                        </tr>
                      ) : (
                        history.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {formatDateTime(item.responded_at || item.created_at)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.hospital_name || '-'}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded">
                                {item.blood_type || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {item.distance_km ? `${Number(item.distance_km).toFixed(1)} km` : '-'}
                            </td>
                            <td className="px-6 py-4">
                              {(item.response_status || item.status) === 'completed' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded">
                                  <CheckCircle className="w-3 h-3" />
                                  {t('donor_dashboard.completed')}
                                </span>
                              ) : (item.response_status || item.status) === 'en_route' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                                  <Clock className="w-3 h-3" />
                                  {t('donor_dashboard.accepted')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-700 text-xs font-semibold rounded">
                                  {t('donor_dashboard.declined')}
                                </span>
                              )}
                            </td>
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
                <h2 className="text-2xl font-bold text-gray-900">{t('donor_dashboard.stats_title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('donor_dashboard.stats_desc')}</p>
              </div>

              {/* Extended KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: t('donor_dashboard.total_donations'), value: stats?.donation_count ?? 0, icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: t('donor_dashboard.completed_donations'), value: stats?.completed_donations ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: t('donor_dashboard.alerts_received_count'), value: stats?.alerts_received ?? 0, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: t('donor_dashboard.accepted_responses'), value: stats?.responses_accepted ?? 0, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: t('donor_dashboard.declined_responses'), value: stats?.responses_declined ?? 0, icon: MapPin, color: 'text-gray-600', bg: 'bg-gray-50' },
                  { label: t('donor_dashboard.lives_impacted'), value: stats?.lives_impacted ?? 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
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
                <h3 className="font-bold text-gray-900 mb-1 text-lg">{t('donor_dashboard.monthly_evolution')}</h3>
                <p className="text-sm text-gray-500 mb-6">{t('donor_dashboard.alerts_vs_responses')}</p>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={monthlyChartData} barSize={20} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mois" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                    />
                    <Bar dataKey="alertes" name={t('donor_dashboard.received_alerts')} fill="#93c5fd" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="reponses" name={t('donor_dashboard.accepted_responses_chart')} fill="#dc2626" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('donor_dashboard.settings_title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('donor_dashboard.settings_desc')}</p>
              </div>

              {/* User Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">{t('donor_dashboard.personal_info')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('donor_dashboard.full_name')}</label>
                    <input
                      type="text"
                      value={`${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('donor_dashboard.email')}</label>
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('donor_dashboard.phone')}</label>
                    <input
                      type="tel"
                      value={currentUser?.phone || ''}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('donor_dashboard.blood_type_label')}</label>
                    <input
                      type="text"
                      value={currentUser?.blood_type || ''}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">{t('donor_dashboard.notifications')}</h3>
                <div className="space-y-3">
                  {[
                    { label: t('donor_dashboard.emergency_alerts'), desc: t('donor_dashboard.emergency_alerts_desc') },
                    { label: t('donor_dashboard.email_notifications'), desc: t('donor_dashboard.email_notifications_desc') },
                    { label: t('donor_dashboard.donation_reminders'), desc: t('donor_dashboard.donation_reminders_desc') },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
