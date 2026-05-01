import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { donor as donorApi, normalizeDonorAlertDetail, type DonorAlertDetail } from '../services/api'
import { useApp } from '../context/AppContext'
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Phone,
  Clock,
  Droplets,
  CheckCircle,
  LocateFixed,
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { fetchOsrmDrivingRoute, straightLineRoute, type RouteLatLng } from '../lib/routing'
import { pushDonorGpsToServer } from '../lib/donorLocationSync'

const hospitalNavIcon = L.divIcon({
  className: 'donor-nav-hospital-icon',
  html: '<div style="background:#dc2626;width:16px;height:16px;border-radius:9999px;border:3px solid #fff;box-shadow:0 0 0 2px #dc2626;"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function NavigationMapFitBounds({ points }: { points: RouteLatLng[] }) {
  const map = useMap()

  useEffect(() => {
    const valid = points.filter(
      (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && !(p[0] === 0 && p[1] === 0),
    )
    if (valid.length === 0) return

    const b = L.latLngBounds(valid)
    if (!b.isValid()) return

    if (valid.length === 1) {
      map.setView(valid[0], 14)
      return
    }
    map.fitBounds(b, { padding: [44, 44], maxZoom: 16, animate: true })
  }, [map, points])

  return null
}

type RouteMode = 'osrm' | 'straight' | 'none'

export default function DonorNavigation() {
  const { alertId } = useParams<{ alertId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [alert, setAlert] = useState<DonorAlertDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [geoDenied, setGeoDenied] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null)
  const [routeLine, setRouteLine] = useState<RouteLatLng[]>([])
  const [routeMode, setRouteMode] = useState<RouteMode>('none')
  const [routeLoading, setRouteLoading] = useState(false)

  async function loadAlert() {
    if (!alertId) return
    setLoading(true)
    try {
      const data = await donorApi.getAlert(alertId)
      setAlert(data)
      const raw = localStorage.getItem('active_donation_context')
      const parsed = raw ? JSON.parse(raw) : {}
      if (parsed?.alert_id === alertId) {
        localStorage.setItem(
          'active_donation_context',
          JSON.stringify({ ...parsed, cached_alert: data, updated_at: new Date().toISOString() }),
        )
      }
    } catch (err: unknown) {
      const raw = localStorage.getItem('active_donation_context')
      const parsed = raw ? JSON.parse(raw) : null
      if (parsed?.alert_id === alertId && parsed?.cached_alert) {
        try {
          setAlert(normalizeDonorAlertDetail(parsed.cached_alert))
          toast.warning('Mode hors ligne: informations d’alerte restaurées localement.')
        } catch {
          toast.error('Données d’alerte locales invalides')
          navigate('/donor/nearby-alerts')
        }
      } else {
        toast.error((err as Error).message ?? 'Erreur de chargement')
        navigate('/donor/nearby-alerts')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlert()
    if (alertId) {
      const storedCode = localStorage.getItem(`confirmation_code_${alertId}`)
      if (storedCode) setConfirmationCode(storedCode)
    }
  }, [alertId])

  // First fix: send GPS once when opening navigation so the hospital map updates immediately.
  useEffect(() => {
    if (!alertId || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void pushDonorGpsToServer(pos.coords.latitude, pos.coords.longitude, { force: true })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
  }, [alertId])

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoDenied(true)
      return
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setUserLocation({ lat, lng })
        setGeoDenied(false)
        void pushDonorGpsToServer(lat, lng)
      },
      () => {
        setGeoDenied(true)
      },
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  useEffect(() => {
    if (
      !alert ||
      !userLocation ||
      !Number.isFinite(alert.latitude) ||
      !Number.isFinite(alert.longitude)
    ) {
      setRouteLine([])
      setRouteMode('none')
      return
    }

    let cancelled = false
    setRouteLoading(true)

    const run = async () => {
      const dest = { lat: alert.latitude, lng: alert.longitude }
      try {
        const pts = await fetchOsrmDrivingRoute(userLocation, dest)
        if (!cancelled && pts.length >= 2) {
          setRouteLine(pts)
          setRouteMode('osrm')
        }
      } catch {
        if (!cancelled) {
          setRouteLine(straightLineRoute(userLocation, dest))
          setRouteMode('straight')
        }
      } finally {
        if (!cancelled) setRouteLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [alert?.id, alert?.latitude, alert?.longitude, userLocation?.lat, userLocation?.lng])

  const fitPoints = useMemo((): RouteLatLng[] => {
    if (routeLine.length >= 2) return routeLine
    if (!alert || !Number.isFinite(alert.latitude) || !Number.isFinite(alert.longitude)) return []
    const pts: RouteLatLng[] = [[alert.latitude, alert.longitude]]
    if (
      userLocation &&
      Number.isFinite(userLocation.lat) &&
      Number.isFinite(userLocation.lng)
    ) {
      pts.unshift([userLocation.lat, userLocation.lng])
    }
    return pts
  }, [routeLine, alert?.latitude, alert?.longitude, userLocation?.lat, userLocation?.lng])

  const mapCenter = useMemo((): RouteLatLng => {
    if (alert && Number.isFinite(alert.latitude) && Number.isFinite(alert.longitude)) {
      return [alert.latitude, alert.longitude]
    }
    return [33.589886, -7.603869]
  }, [alert?.latitude, alert?.longitude])

  const refreshLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        toast.success('Position mise à jour')
      },
      () => toast.error('Position indisponible'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  const openGoogleMaps = () => {
    if (!alert) return
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${alert.latitude},${alert.longitude}`
      window.open(url, '_blank')
      return
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}&travelmode=driving`
    window.open(url, '_blank')
  }

  const openWaze = () => {
    if (!alert) return
    const url = `https://waze.com/ul?ll=${alert.latitude},${alert.longitude}&navigate=yes`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des détails...</p>
        </div>
      </div>
    )
  }

  if (!alert) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Alerte non trouvée</p>
          <button
            onClick={() => navigate('/donor/nearby-alerts')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Retour aux alertes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/donor/nearby-alerts')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
          <h1 className="text-lg font-bold text-gray-900">Navigation vers l'hôpital</h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{alert.hospital_name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 text-sm font-semibold rounded-full">
                  <Droplets className="w-4 h-4" />
                  {alert.blood_type}
                </span>
                <span className="text-sm text-gray-600">{alert.units_needed} poche(s) nécessaire(s)</span>
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

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-2">
              <CheckCircle className="w-5 h-5" />
              Réponse acceptée
            </div>
            <p className="text-emerald-600 text-sm">
              Vous avez accepté cette alerte. L'hôpital a été notifié de votre arrivée prochaine.
            </p>
            {confirmationCode ? (
              <div className="mt-3 pt-3 border-t border-emerald-200">
                <p className="text-xs text-emerald-700 uppercase tracking-wider">Code de confirmation</p>
                <p className="text-xl font-black tracking-wider text-emerald-700">{confirmationCode}</p>
                <p className="text-xs text-emerald-600">Présentez ce code à l'hôpital à votre arrivée.</p>
                <img
                  className="mt-3 h-36 w-36 rounded-md border border-emerald-200 bg-white p-1"
                  alt="QR code de confirmation donneur"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    JSON.stringify({
                      alert_id: alert.id,
                      donor_id: currentUser?.id ?? '',
                      confirmation_code: confirmationCode,
                    }),
                  )}`}
                />
              </div>
            ) : null}
          </div>

          {alert.video_url ? (
            <div className="mt-4">
              <video src={alert.video_url} controls className="w-full rounded-lg max-h-[300px]" />
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Carte & itinéraire</h3>
          <p className="text-sm text-gray-600 mb-3">
            Votre position (bleu), l'hôpital (rouge), et le trajet à suivre sur le réseau routier lorsque c'est
            disponible.
          </p>
          {!Number.isFinite(alert.latitude) || !Number.isFinite(alert.longitude) ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Coordonnées de l'hôpital indisponibles. Utilisez Google Maps ou Waze ci-dessous.
            </div>
          ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 h-[min(420px,70vh)] min-h-[280px] relative z-0">
            <MapContainer center={mapCenter} zoom={13} scrollWheelZoom className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <NavigationMapFitBounds points={fitPoints} />

              <Marker position={[alert.latitude, alert.longitude]} icon={hospitalNavIcon}>
                <Popup>
                  <span className="font-semibold">{alert.hospital_name}</span>
                  <br />
                  Destination
                </Popup>
              </Marker>

              {userLocation &&
                Number.isFinite(userLocation.lat) &&
                Number.isFinite(userLocation.lng) && (
                <CircleMarker
                  center={[userLocation.lat, userLocation.lng]}
                  radius={9}
                  pathOptions={{
                    color: '#1d4ed8',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>Vous êtes ici</Popup>
                </CircleMarker>
              )}

              {routeLine.length >= 2 && (
                <Polyline
                  positions={routeLine}
                  pathOptions={{
                    color: routeMode === 'osrm' ? '#2563eb' : '#64748b',
                    weight: routeMode === 'osrm' ? 5 : 3,
                    opacity: 0.88,
                    dashArray: routeMode === 'straight' ? '10 8' : undefined,
                  }}
                />
              )}
            </MapContainer>
          </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
            <div>
              {routeLoading && userLocation ? (
                <span>Calcul de l'itinéraire…</span>
              ) : routeMode === 'osrm' ? (
                <span className="text-blue-700 font-medium">Itinéraire routier (aperçu)</span>
              ) : routeMode === 'straight' && userLocation ? (
                <span className="text-slate-600">
                  Ligne directe (service d'itinéraire indisponible — ouvrez Google Maps pour la navigation détaillée).
                </span>
              ) : !userLocation ? (
                <span className={geoDenied ? 'text-amber-700' : ''}>
                  {geoDenied
                    ? 'Localisation refusée : la carte affiche l’hôpital. Activez la géolocalisation ou utilisez les apps ci-dessous.'
                    : 'Recherche de votre position…'}
                </span>
              ) : (
                <span>Prêt</span>
              )}
            </div>
            <button
              type="button"
              onClick={refreshLocation}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              Actualiser la position
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Navigation GPS (applications)</h3>
          <p className="text-sm text-gray-500 mb-4">
            Pour les indications virage par virage et le trafic en temps réel, ouvrez une application dédiée.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={openGoogleMaps}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Navigation className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Google Maps</p>
                <p className="text-sm text-gray-500">Navigation GPS complète</p>
              </div>
            </button>

            <button
              onClick={openWaze}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Navigation className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Waze</p>
                <p className="text-sm text-gray-500">Trafic en temps réel</p>
              </div>
            </button>
          </div>
        </div>

        {alert.contact_phone && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Contact hôpital</h3>
            <a
              href={`tel:${alert.contact_phone}`}
              className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Appeler l'hôpital</p>
                <p className="text-sm text-gray-500">{alert.contact_phone}</p>
              </div>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
