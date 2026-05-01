import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  LoaderCircle,
  MapPin,
  Navigation,
  Trash2,
  Upload,
} from 'lucide-react'
import { type ComponentType, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { auth } from '../services/api'

type Step = 1 | 2 | 3 | 4

type RegistrationForm = {
  hospital_name: string
  email: string
  password: string
  first_name: string
  last_name: string
  phone: string
  latitude: string
  longitude: string
}

type UploadStatus = 'uploading' | 'completed' | 'error'

type UploadedDocument = {
  id: string
  file: File
  progress: number
  status: UploadStatus
  completedAt: number | null
}

type LeafletMapComponents = {
  MapContainer: ComponentType<any>
  Marker: ComponentType<any>
  TileLayer: ComponentType<any>
  useMapEvents: (handlers: Record<string, (...args: any[]) => void>) => void
}

const STEP_LABELS: Array<{ id: Step; title: string; subtitle: string }> = [
  { id: 1, title: 'Informations', subtitle: 'Coordonnées de l’hôpital' },
  { id: 2, title: 'Documents', subtitle: 'Licence et justificatifs' },
  { id: 3, title: 'Localisation', subtitle: 'Position de l’établissement' },
  { id: 4, title: 'Confirmation', subtitle: 'Compte créé avec succès' },
]

const INITIAL_FORM: RegistrationForm = {
  hospital_name: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone: '',
  latitude: '36.8065',
  longitude: '10.1815',
}

const DOCUMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg'

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} o`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} Ko`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

function SafeLocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number
  longitude: number
  onChange: (latitude: number, longitude: number) => void
}) {
  const [components, setComponents] = useState<LeafletMapComponents | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadMap = async () => {
      try {
        const leaflet = await import('leaflet')
        const reactLeaflet = await import('react-leaflet')

        delete (
          leaflet.Icon.Default.prototype as typeof leaflet.Icon.Default.prototype & {
            _getIconUrl?: unknown
          }
        )._getIconUrl

        leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
          iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
          shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
        })

        if (!mounted) {
          return
        }

        setComponents({
          MapContainer: reactLeaflet.MapContainer,
          Marker: reactLeaflet.Marker,
          TileLayer: reactLeaflet.TileLayer,
          useMapEvents: reactLeaflet.useMapEvents,
        })
      } catch (error) {
        console.error('Failed to load Leaflet map', error)

        if (mounted) {
          setMapError('La carte n’a pas pu être chargée. Vous pouvez tout de même saisir les coordonnées manuellement.')
        }
      }
    }

    loadMap()

    return () => {
      mounted = false
    }
  }, [])

  if (mapError) {
    return (
      <div className='rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
        {mapError}
      </div>
    )
  }

  if (!components) {
    return (
      <div className='flex h-72 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-slate-500'>
        <div className='flex items-center gap-2'>
          <LoaderCircle className='h-5 w-5 animate-spin' />
          <span>Chargement de la carte…</span>
        </div>
      </div>
    )
  }

  const { MapContainer, Marker, TileLayer, useMapEvents } = components
  const center: [number, number] = [latitude, longitude]

  function LocationMarker() {
    useMapEvents({
      click(event: any) {
        onChange(
          Number(event.latlng.lat.toFixed(6)),
          Number(event.latlng.lng.toFixed(6)),
        )
      },
    })

    return <Marker position={center} />
  }

  return (
    <div className='overflow-hidden rounded-3xl border border-slate-200 shadow-sm'>
      <MapContainer
        key="hospital-location-map"
        center={center}
        zoom={13}
        scrollWheelZoom
        className='h-72 w-full'
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <LocationMarker />
      </MapContainer>
    </div>
  )
}

export default function HospitalRegistration() {
  const navigate = useNavigate()
  const { login } = useApp()

  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<RegistrationForm>(INITIAL_FORM)
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [isClient, setIsClient] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const uploadTimersRef = useRef<Record<string, number>>({})
  const redirectTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setIsClient(true)

    return () => {
      Object.values(uploadTimersRef.current).forEach((timer) => window.clearInterval(timer))

      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  const selectedLicenseDocument = useMemo(
    () =>
      [...documents]
        .filter((document) => document.status === 'completed' && document.completedAt !== null)
        .sort((first, second) => (first.completedAt ?? 0) - (second.completedAt ?? 0))[0] ?? null,
    [documents],
  )

  const completedLicense = selectedLicenseDocument?.file ?? null

  const handleInputChange = (field: keyof RegistrationForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const startUploadSimulation = (documentId: string) => {
    let progress = 18

    const timer = window.setInterval(() => {
      progress = Math.min(progress + Math.floor(Math.random() * 22) + 12, 100)

      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId
            ? {
                ...document,
                progress,
                status: progress >= 100 ? 'completed' : 'uploading',
                completedAt: progress >= 100 ? Date.now() : document.completedAt,
              }
            : document,
        ),
      )

      if (progress >= 100) {
        window.clearInterval(timer)
        delete uploadTimersRef.current[documentId]
      }
    }, 180)

    uploadTimersRef.current[documentId] = timer
  }

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList?.length) {
      return
    }

    const newDocuments = Array.from(fileList).map((file) => ({
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      progress: 12,
      status: 'uploading' as UploadStatus,
      completedAt: null,
    }))

    setDocuments((current) => [...current, ...newDocuments])

    newDocuments.forEach((document) => {
      startUploadSimulation(document.id)
    })
  }

  const removeDocument = (documentId: string) => {
    const timer = uploadTimersRef.current[documentId]

    if (timer) {
      window.clearInterval(timer)
      delete uploadTimersRef.current[documentId]
    }

    setDocuments((current) => current.filter((document) => document.id !== documentId))
  }

  const updateCoordinates = (latitude: number, longitude: number) => {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }))
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n’est pas disponible sur cet appareil.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateCoordinates(position.coords.latitude, position.coords.longitude)
        toast.success('Position mise à jour.')
      },
      (error) => {
        toast.error(error.message || 'Impossible de récupérer votre position actuelle.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    )
  }

  const validateCurrentStep = () => {
    if (step === 1) {
      if (
        !form.hospital_name.trim() ||
        !form.email.trim() ||
        !form.password.trim() ||
        !form.first_name.trim() ||
        !form.last_name.trim() ||
        !form.phone.trim()
      ) {
        toast.error('Veuillez remplir toutes les informations requises.')
        return false
      }

      return true
    }

    if (step === 2) {
      if (!documents.length) {
        toast.error('Veuillez ajouter au moins une licence ou un document justificatif.')
        return false
      }

      if (!completedLicense) {
        toast.error('Veuillez attendre la fin du téléversement du document principal.')
        return false
      }

      return true
    }

    if (step === 3) {
      const latitude = Number(form.latitude)
      const longitude = Number(form.longitude)

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        toast.error('Veuillez renseigner des coordonnées valides.')
        return false
      }

      return true
    }

    return true
  }

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return
    }

    setStep((current) => (current < 4 ? ((current + 1) as Step) : current))
  }

  const handlePrevious = () => {
    setStep((current) => (current > 1 ? ((current - 1) as Step) : current))
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return
    }

    setSubmitting(true)

    try {
      const response = await auth.registerHospital({
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        hospital_name: form.hospital_name.trim(),
        license: completedLicense ?? documents[0]?.file ?? null,
      })

      login(response.data.token, response.data.user)
      setStep(4)
      toast.success('Inscription finalisée avec succès.')

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate('/hospital/dashboard')
      }, 1400)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'L’inscription a échoué. Veuillez réessayer.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='min-h-screen bg-slate-950 px-4 py-10 text-white'>
      <div className='mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row'>
        <aside className='w-full rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur lg:max-w-sm'>
          <div className='mb-8 flex items-center gap-3'>
            <div className='rounded-2xl bg-red-500/15 p-3 text-red-300'>
              <Building2 className='h-6 w-6' />
            </div>
            <div>
              <p className='text-sm font-medium text-red-300'>Urgence Sang</p>
              <h1 className='text-2xl font-semibold'>Inscription hôpital</h1>
            </div>
          </div>

          <div className='space-y-4'>
            {STEP_LABELS.map((item) => {
              const isActive = item.id === step
              const isCompleted = item.id < step

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition ${
                    isActive
                      ? 'border-red-400/70 bg-red-500/10'
                      : isCompleted
                        ? 'border-emerald-400/30 bg-emerald-500/10'
                        : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className='flex items-start gap-3'>
                    <div
                      className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isActive
                            ? 'bg-red-500 text-white'
                            : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className='h-5 w-5' /> : item.id}
                    </div>
                    <div>
                      <h2 className='font-semibold'>{item.title}</h2>
                      <p className='text-sm text-white/65'>{item.subtitle}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className='mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70'>
            <p className='font-medium text-white'>Documents acceptés</p>
            <p className='mt-2'>
              PDF, PNG ou JPG. Le premier document terminé sera envoyé au backend comme licence officielle.
            </p>
          </div>
        </aside>

        <main className='flex-1 rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl shadow-black/20 lg:p-8'>
          <AnimatePresence mode='wait'>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className='space-y-6'
            >
              {step === 1 && (
                <>
                  <div>
                    <p className='text-sm font-medium uppercase tracking-[0.2em] text-red-500'>Étape 1</p>
                    <h2 className='mt-2 text-3xl font-semibold'>Informations générales</h2>
                    <p className='mt-2 text-slate-600'>
                      Renseignez les coordonnées du responsable et les informations de l’établissement.
                    </p>
                  </div>

                  <div className='grid gap-4 md:grid-cols-2'>
                    <label className='space-y-2 md:col-span-2'>
                      <span className='text-sm font-medium text-slate-700'>Nom de l’hôpital</span>
                      <input
                        value={form.hospital_name}
                        onChange={(event) => handleInputChange('hospital_name', event.target.value)}
                        className='w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        placeholder='Centre hospitalier régional'
                      />
                    </label>

                    <label className='space-y-2'>
                      <span className='text-sm font-medium text-slate-700'>Prénom du responsable</span>
                      <input
                        value={form.first_name}
                        onChange={(event) => handleInputChange('first_name', event.target.value)}
                        className='w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        placeholder='Amine'
                      />
                    </label>

                    <label className='space-y-2'>
                      <span className='text-sm font-medium text-slate-700'>Nom du responsable</span>
                      <input
                        value={form.last_name}
                        onChange={(event) => handleInputChange('last_name', event.target.value)}
                        className='w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        placeholder='Ben Salah'
                      />
                    </label>

                    <label className='space-y-2'>
                      <span className='text-sm font-medium text-slate-700'>Adresse e-mail</span>
                      <input
                        type='email'
                        value={form.email}
                        onChange={(event) => handleInputChange('email', event.target.value)}
                        className='w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        placeholder='contact@hopital.tn'
                      />
                    </label>

                    <label className='space-y-2'>
                      <span className='text-sm font-medium text-slate-700'>Téléphone</span>
                      <input
                        value={form.phone}
                        onChange={(event) => handleInputChange('phone', event.target.value)}
                        className='w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        placeholder='+216 20 000 000'
                      />
                    </label>

                    <label className='space-y-2 md:col-span-2'>
                      <span className='text-sm font-medium text-slate-700'>Mot de passe</span>
                      <input
                        type='password'
                        value={form.password}
                        onChange={(event) => handleInputChange('password', event.target.value)}
                        className='w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        placeholder='••••••••'
                      />
                    </label>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <p className='text-sm font-medium uppercase tracking-[0.2em] text-red-500'>Étape 2</p>
                    <h2 className='mt-2 text-3xl font-semibold'>Téléversement des documents</h2>
                    <p className='mt-2 text-slate-600'>
                      Ajoutez la licence de l’établissement. Une vraie pièce jointe sera envoyée au backend lors de l’inscription.
                    </p>
                  </div>

                  <label className='flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-red-200 bg-red-50 px-6 py-12 text-center transition hover:border-red-300 hover:bg-red-100/60'>
                    <input
                      type='file'
                      accept={DOCUMENT_ACCEPT}
                      multiple
                      className='hidden'
                      onChange={(event) => {
                        handleFilesSelected(event.target.files)
                        event.target.value = ''
                      }}
                    />
                    <div className='rounded-full bg-white p-4 text-red-500 shadow-sm'>
                      <Upload className='h-7 w-7' />
                    </div>
                    <p className='mt-4 text-lg font-semibold'>Sélectionner des documents</p>
                    <p className='mt-2 max-w-xl text-sm text-slate-600'>
                      Formats autorisés : PDF, JPG, JPEG, PNG. Le premier fichier terminé sera utilisé comme licence (`license`).
                    </p>
                  </label>

                  {documents.length ? (
                    <div className='space-y-3'>
                      {documents.map((document) => (
                        <div
                          key={document.id}
                          className='rounded-3xl border border-slate-200 p-4 shadow-sm'
                        >
                          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                            <div className='flex min-w-0 items-center gap-3'>
                              <div className='rounded-2xl bg-slate-100 p-3 text-slate-600'>
                                <FileText className='h-5 w-5' />
                              </div>
                              <div className='min-w-0'>
                                <div className='flex flex-wrap items-center gap-2'>
                                  <p className='truncate font-semibold' title={document.file.name}>
                                    {document.file.name}
                                  </p>
                                  {selectedLicenseDocument?.id === document.id && (
                                    <span className='rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700'>
                                      Licence envoyée
                                    </span>
                                  )}
                                </div>
                                <p className='text-sm text-slate-500'>{formatFileSize(document.file.size)}</p>
                              </div>
                            </div>

                            <div className='flex items-center gap-3'>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  document.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : document.status === 'error'
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {document.status === 'completed'
                                  ? 'Terminé'
                                  : document.status === 'error'
                                    ? 'Erreur'
                                    : 'En cours'}
                              </span>
                              <button
                                type='button'
                                onClick={() => removeDocument(document.id)}
                                className='rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                                aria-label={`Supprimer ${document.file.name}`}
                              >
                                <Trash2 className='h-4 w-4' />
                              </button>
                            </div>
                          </div>

                          <div className='mt-4 h-2 overflow-hidden rounded-full bg-slate-100'>
                            <div
                              className={`h-full rounded-full transition-all ${
                                document.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${document.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500'>
                      Aucun document sélectionné pour le moment.
                    </div>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
                    <div>
                      <p className='text-sm font-medium uppercase tracking-[0.2em] text-red-500'>Étape 3</p>
                      <h2 className='mt-2 text-3xl font-semibold'>Position sur la carte</h2>
                      <p className='mt-2 text-slate-600'>
                        Cliquez sur la carte ou utilisez votre position actuelle. Si la carte ne se charge pas, la saisie manuelle reste disponible.
                      </p>
                    </div>

                    <button
                      type='button'
                      onClick={handleUseCurrentLocation}
                      className='inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                    >
                      <Navigation className='h-4 w-4' />
                      Utiliser ma position
                    </button>
                  </div>

                  <div className='grid gap-4 md:grid-cols-2'>
                    <label className='space-y-2'>
                      <span className='text-sm font-medium text-slate-700'>Latitude</span>
                      <input
                        value={form.latitude}
                        onChange={(event) => handleInputChange('latitude', event.target.value)}
                        className='w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        placeholder='36.8065'
                      />
                    </label>

                    <label className='space-y-2'>
                      <span className='text-sm font-medium text-slate-700'>Longitude</span>
                      <input
                        value={form.longitude}
                        onChange={(event) => handleInputChange('longitude', event.target.value)}
                        className='w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        placeholder='10.1815'
                      />
                    </label>
                  </div>

                  {isClient ? (
                    <div className='rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center'>
                      <MapPin className='mx-auto h-12 w-12 text-slate-400 mb-3' />
                      <p className='text-slate-700 font-medium'>Carte temporairement désactivée</p>
                      <p className='text-sm text-slate-500 mt-2'>
                        Veuillez saisir les coordonnées manuellement dans les champs ci-dessus,
                        ou utiliser le bouton "Utiliser ma position" pour la géolocalisation automatique.
                      </p>
                    </div>
                  ) : (
                    <div className='flex h-72 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-slate-500'>
                      Préparation de la carte…
                    </div>
                  )}

                  <div className='flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'>
                    <MapPin className='h-5 w-5 text-red-500' />
                    <span>
                      Coordonnées sélectionnées : <strong>{form.latitude}</strong>, <strong>{form.longitude}</strong>
                    </span>
                  </div>
                </>
              )}

              {step === 4 && (
                <div className='flex min-h-[420px] flex-col items-center justify-center text-center'>
                  <div className='rounded-full bg-emerald-100 p-5 text-emerald-600'>
                    <CheckCircle2 className='h-12 w-12' />
                  </div>
                  <h2 className='mt-6 text-3xl font-semibold'>Compte hôpital créé</h2>
                  <p className='mt-3 max-w-xl text-slate-600'>
                    Votre établissement a bien été enregistré. Redirection vers le tableau de bord…
                  </p>
                  <button
                    type='button'
                    onClick={() => navigate('/hospital/dashboard')}
                    className='mt-8 inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600'
                  >
                    Accéder au tableau de bord
                    <ArrowRight className='h-4 w-4' />
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {step < 4 && (
            <div className='mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between'>
              <button
                type='button'
                onClick={handlePrevious}
                disabled={step === 1 || submitting}
                className='inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <ArrowLeft className='h-4 w-4' />
                Retour
              </button>

              {step === 3 ? (
                <button
                  type='button'
                  onClick={handleSubmit}
                  disabled={submitting}
                  className='inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70'
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className='h-4 w-4 animate-spin' />
                      Création du compte…
                    </>
                  ) : (
                    <>
                      Finaliser l’inscription
                      <ArrowRight className='h-4 w-4' />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type='button'
                  onClick={handleNext}
                  disabled={submitting}
                  className='inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70'
                >
                  Continuer
                  <ArrowRight className='h-4 w-4' />
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}