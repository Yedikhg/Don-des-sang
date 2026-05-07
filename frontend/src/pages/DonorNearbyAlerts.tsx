import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { donor as donorApi, type DonorAlert } from '../services/api'
import { pushDonorGpsToServer } from '../lib/donorLocationSync'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Droplets,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react'

const ACTIVE_DONATION_KEY = 'active_donation_context'

export default function DonorNearbyAlerts() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<DonorAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  async function loadAlerts() {
    setLoading(true)
    try {
      const res = await donorApi.nearbyAlerts()
      const nextAlerts: DonorAlert[] = Array.isArray(res.data) ? res.data : []
      setAlerts(nextAlerts)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? t('donor_nearby_alerts.error_loading'))
    } finally {
      setLoading(false)
    }
  }

  async function handleRespond(alertId: string, accept: boolean) {
    setResponding(alertId)
    try {
      const res = await donorApi.respond(alertId, accept)
      if (accept) {
        const code = res?.data?.confirmation_code
        if (code) {
          localStorage.setItem(`confirmation_code_${alertId}`, code)
          localStorage.setItem(
            ACTIVE_DONATION_KEY,
            JSON.stringify({
              alert_id: alertId,
              confirmation_code: code,
              updated_at: new Date().toISOString(),
            })
          )
        }
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              void pushDonorGpsToServer(pos.coords.latitude, pos.coords.longitude, { force: true })
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
          )
        }
        toast.success(t('donor_nearby_alerts.accept_toast'))
        setTimeout(() => {
          navigate(`/donor/navigation/${alertId}`)
        }, 1500)
      } else {
        toast.success(t('donor_nearby_alerts.decline_toast'))
        await loadAlerts()
      }
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Erreur')
    } finally {
      setResponding(null)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des alertes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/donor/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour au tableau de bord
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Alertes à proximité</h1>
          <p className="text-gray-500 mt-1">Répondez aux alertes urgentes près de vous</p>
        </div>

        {/* Alerts list */}
        {alerts.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Aucune alerte disponible</h2>
            <p className="text-gray-500">Il n'y a pas d'alertes urgentes dans votre zone pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{alert.hospital_name}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 text-sm font-semibold rounded-full">
                        <Droplets className="w-4 h-4" />
                        {alert.blood_type}
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 text-sm font-semibold rounded-full">
                        <AlertTriangle className="w-4 h-4" />
                        {alert.emergency_level}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-blue-600 font-semibold">
                      <MapPin className="w-4 h-4" />
                      {alert.distance_km.toFixed(1)} km
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-600">
                    <span className="font-semibold">{alert.quantity_units}</span> {t('donor_nearby_alerts.pouches_needed')}
                  </p>
                </div>

                {alert.video_url && (
                  <div className="mb-4">
                    <video
                      src={alert.video_url}
                      controls
                      className="w-full rounded-lg"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleRespond(alert.id, true)}
                    disabled={responding === alert.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {responding === alert.id ? t('donor_nearby_alerts.processing') : t('donor_nearby_alerts.accept')}
                  </button>
                  <button
                    onClick={() => handleRespond(alert.id, false)}
                    disabled={responding === alert.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 disabled:opacity-50 text-gray-700 font-semibold rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <X className="w-5 h-5" />
                    {t('donor_nearby_alerts.decline')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
