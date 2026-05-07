import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  HeartPulse,
  LoaderCircle,
  MapPin,
  Phone,
  ShieldAlert,
  XCircle,
  Send,
  User,
  Bot,
} from 'lucide-react'
import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { donor as donorApi, ai as aiApi, type DonorAlertDetail, type ChatMessage } from '../services/api'
import { pushDonorGpsToServer } from '../lib/donorLocationSync'

const demoAlert: DonorAlertDetail = {
  id: 'demo',
  hospital_name: 'Hôpital Central - Mode démo',
  blood_type: 'O-',
  units_needed: 3,
  emergency_level: 'critical',
  latitude: 33.589886,
  longitude: -7.603869,
  distance_km: 4.2,
  contact_phone: '+212 600 000 000',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Non disponible'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Non disponible'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getEmergencyMeta(level: string | undefined) {
  switch (level) {
    case 'critical':
      return {
        label: 'Critique',
        classes: 'border-red-200 bg-red-50 text-red-700',
      }
    case 'high':
      return {
        label: 'Élevée',
        classes: 'border-orange-200 bg-orange-50 text-orange-700',
      }
    default:
      return {
        label: 'Modérée',
        classes: 'border-amber-200 bg-amber-50 text-amber-700',
      }
  }
}

export default function CriticalAlertPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const isDemo = id === 'demo'

  const [alert, setAlert] = useState<DonorAlertDetail | null>(isDemo ? demoAlert : null)
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null)
  
  const [showHealthVerification, setShowHealthVerification] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [isEligible, setIsEligible] = useState<boolean | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const emergencyMeta = useMemo(() => getEmergencyMeta(alert?.emergency_level), [alert?.emergency_level])

  async function loadAlert(alertId: string) {
    setLoading(true)
    setError(null)
    setAccepted(false)

    try {
      const data = await donorApi.getAlert(alertId)
      setAlert(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de récupérer cette alerte'
      setAlert(null)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) {
      setAlert(null)
      setLoading(false)
      setError('Alerte introuvable')
      return
    }

    if (isDemo) {
      setAlert(demoAlert)
      setLoading(false)
      setError(null)
      setAccepted(false)
      return
    }

    void loadAlert(id)
  }, [id, isDemo])

  async function handleAccept() {
    if (!id || !alert || submitting) {
      return
    }

    if (isDemo) {
      setAccepted(true)
      toast.success('Mode démo : réponse positive simulée')
      return
    }

    setSubmitting(true)

    try {
      const res = await donorApi.respond(alert.id || id, true)
      const code = res?.data?.confirmation_code ?? null
      if (code) {
        setConfirmationCode(code)
        localStorage.setItem(`confirmation_code_${alert.id || id}`, code)
        localStorage.setItem(
          'active_donation_context',
          JSON.stringify({
            alert_id: alert.id || id,
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
      setAccepted(true)
      toast.success('Votre réponse a bien été envoyée')
      setTimeout(() => {
        navigate(`/donor/navigation/${alert.id || id}`)
      }, 900)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible d’accepter cette alerte'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function startHealthVerification() {
    setShowHealthVerification(true)
    setChatMessages([])
    setIsEligible(null)
    
    setChatLoading(true)
    try {
      const donorName = currentUser?.first_name || 'Donneur'
      const bloodType = currentUser?.blood_type || ''
      const response = await aiApi.chat('Bonjour, je veux donner du sang.', [], donorName, bloodType)
      setChatMessages([{ role: 'assistant', content: response.reply }])
      setIsEligible(response.eligible)
    } catch (err) {
      toast.error('Impossible de lancer la vérification santé')
    } finally {
      setChatLoading(false)
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    
    const newMessages = [...chatMessages, { role: 'user', content: userMessage } as ChatMessage]
    setChatMessages(newMessages)
    setChatLoading(true)

    try {
      const donorName = currentUser?.first_name || 'Donneur'
      const bloodType = currentUser?.blood_type || ''
      const response = await aiApi.chat(userMessage, newMessages, donorName, bloodType)
      const finalMessages = [...newMessages, { role: 'assistant', content: response.reply } as ChatMessage]
      setChatMessages(finalMessages)
      setIsEligible(response.eligible)
    } catch (err) {
      toast.error('Erreur lors de la vérification santé')
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  async function handleDecline() {
    if (!id || submitting) {
      return
    }

    if (isDemo) {
      navigate('/donor/dashboard')
      return
    }

    setSubmitting(true)

    try {
      await donorApi.respond(alert?.id || id, false)
      toast.success('Votre refus a bien été enregistré')
      navigate('/donor/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de refuser cette alerte'
      toast.error(message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 px-6 py-12'>
        <div className='mx-auto flex max-w-3xl items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm'>
          <div>
            <LoaderCircle className='mx-auto mb-4 h-8 w-8 animate-spin text-red-600' />
            <p className='text-lg font-bold text-gray-900'>Chargement de l’alerte…</p>
            <p className='mt-2 text-sm text-gray-500'>Nous récupérons les informations de l’hôpital et du besoin urgent.</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !isDemo) {
    return (
      <div className='min-h-screen bg-gray-50 px-6 py-12'>
        <div className='mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center'>
          <AlertTriangle className='mx-auto h-10 w-10 text-rose-600' />
          <h1 className='mt-4 text-2xl font-bold text-rose-900'>Alerte indisponible</h1>
          <p className='mt-3 text-sm text-rose-700/90'>{error}</p>

          <div className='mt-6 flex flex-wrap items-center justify-center gap-3'>
            {id ? (
              <button
                type='button'
                onClick={() => void loadAlert(id)}
                className='rounded-lg border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 shadow-sm'
              >
                Réessayer
              </button>
            ) : null}
            <Link
              to='/donor/dashboard'
              className='rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 shadow-md'
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!alert) {
    return (
      <div className='min-h-screen bg-gray-50 px-6 py-12'>
        <div className='mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm'>
          <ShieldAlert className='mx-auto h-10 w-10 text-gray-400' />
          <h1 className='mt-4 text-2xl font-bold text-gray-900'>Aucune alerte à afficher</h1>
          <p className='mt-3 text-sm text-gray-500'>Cette alerte n’est plus disponible ou n’a pas été trouvée.</p>
          <Link
            to='/donor/dashboard'
            className='mt-6 inline-flex rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm'
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className='min-h-screen bg-gray-50 px-6 py-12'>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className='mx-auto max-w-3xl rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm'
        >
          <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 mb-6'>
            <CheckCircle2 className='h-10 w-10 text-emerald-600' />
          </div>
          <p className='text-sm font-semibold uppercase tracking-wider text-emerald-600 mb-2'>{isDemo ? 'Mode démo' : 'Réponse confirmée'}</p>
          <h1 className='text-3xl font-extrabold text-gray-900'>Merci pour votre engagement</h1>
          <p className='mt-3 text-sm text-gray-500'>
            {isDemo
              ? 'Vous avez simulé une acceptation d’alerte. Aucun enregistrement réel n’a été créé.'
              : 'Votre acceptation a été enregistrée et transmise à l’équipe hospitalière.'}
          </p>

          <div className='mt-8 grid gap-4 rounded-xl border border-gray-100 bg-gray-50 p-6 text-left md:grid-cols-2'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>Hôpital</p>
              <p className='mt-1 text-lg font-bold text-gray-900'>{alert.hospital_name}</p>
            </div>
            <div>
              <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>Groupe requis</p>
              <p className='mt-1 text-lg font-bold text-gray-900'>{alert.blood_type}</p>
            </div>
            <div>
              <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>Quantité demandée</p>
              <p className='mt-1 text-lg font-bold text-gray-900'>{alert.units_needed} poche(s)</p>
            </div>
            <div>
              <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>Date limite</p>
              <p className='mt-1 text-lg font-bold text-gray-900'>{formatDateTime(alert.expires_at)}</p>
            </div>
          </div>

          {confirmationCode ? (
            <div className='mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6'>
              <p className='text-xs font-semibold uppercase tracking-wider text-emerald-800'>Code de confirmation</p>
              <p className='mt-2 text-3xl font-black tracking-widest text-emerald-700'>{confirmationCode}</p>
              <p className='mt-2 text-sm text-emerald-600'>
                Donnez ce code à l&apos;hôpital pour valider votre arrivée.
              </p>
              <div className='mt-4 flex justify-center'>
                <img
                  className='h-40 w-40 rounded-xl border border-emerald-200 bg-white p-2 shadow-sm'
                  alt='QR code de confirmation donneur'
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    JSON.stringify({
                      alert_id: alert.id || id,
                      donor_id: currentUser?.id ?? '',
                      confirmation_code: confirmationCode,
                    })
                  )}`}
                />
              </div>
            </div>
          ) : null}

          <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
            <Link
              to='/donor/dashboard'
              className='rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 shadow-sm hover:shadow-md active:scale-95'
            >
              Retour au tableau de bord
            </Link>
            {!isDemo ? (
              <a
                href={`tel:${alert.contact_phone}`}
                className='flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 shadow-md hover:shadow-lg active:scale-95'
              >
                <Phone className="w-4 h-4" />
                Contacter l’hôpital
              </a>
            ) : null}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 px-4 py-8 sm:px-6'>
      <div className='mx-auto flex max-w-5xl flex-col gap-6'>
        <div className='flex items-center justify-between gap-4'>
          <Link
            to='/donor/dashboard'
            className='inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900 shadow-sm'
          >
            <ArrowLeft className='h-4 w-4' />
            Retour
          </Link>

          {isDemo ? (
            <span className='rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-700'>
              Démo
            </span>
          ) : null}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className='relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm'
        >
          <div className="absolute top-0 left-0 h-full w-1.5 bg-red-600" />
          <div className='p-6 sm:p-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between ml-1.5'>
            <div>
              <div className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${emergencyMeta.classes}`}>
                <AlertTriangle className='h-4 w-4' />
                Urgence {emergencyMeta.label.toLowerCase()}
              </div>

              <h1 className='mt-5 text-3xl font-extrabold text-gray-900 md:text-4xl tracking-tight'>{alert.hospital_name}</h1>
              <p className='mt-3 max-w-2xl text-base text-gray-500 leading-relaxed'>
                Un besoin de sang <strong className="font-bold text-gray-900">{alert.blood_type}</strong> a été déclaré. Merci de confirmer rapidement si vous pouvez vous rendre
                sur place.
              </p>
            </div>

            <div className='rounded-xl border border-red-100 bg-red-50 p-6 text-center lg:min-w-[220px] shadow-sm'>
              <p className='text-xs font-bold uppercase tracking-wider text-red-600'>Besoin immédiat</p>
              <p className='mt-2 text-5xl font-black text-red-700'>{alert.units_needed}</p>
              <p className='mt-1 text-sm font-medium text-red-600/80'>poche(s) demandée(s)</p>
            </div>
          </div>
        </motion.section>

        <section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <div className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md'>
            <div className='flex items-center gap-4'>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <HeartPulse className='h-6 w-6' />
              </div>
              <div>
                <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Groupe requis</p>
                <p className='text-xl font-bold text-gray-900'>{alert.blood_type}</p>
              </div>
            </div>
          </div>

          <div className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md'>
            <div className='flex items-center gap-4'>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock3 className='h-6 w-6' />
              </div>
              <div>
                <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Expire le</p>
                <p className='text-lg font-bold text-gray-900'>{formatDateTime(alert.expires_at)}</p>
              </div>
            </div>
          </div>

          <div className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md'>
            <div className='flex items-center gap-4'>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <MapPin className='h-6 w-6' />
              </div>
              <div>
                <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Distance estimée</p>
                <p className='text-xl font-bold text-gray-900'>{alert.distance_km.toFixed(1)} km</p>
              </div>
            </div>
          </div>

          <div className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md'>
            <div className='flex items-center gap-4'>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Phone className='h-6 w-6' />
              </div>
              <div>
                <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Contact</p>
                <p className='text-lg font-bold text-gray-900'>{alert.contact_phone}</p>
              </div>
            </div>
          </div>
        </section>

        <section className='grid gap-6 lg:grid-cols-[1.5fr_1fr]'>
          <article className='rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col'>
            <h2 className='text-xl font-extrabold text-gray-900'>Détails de l’alerte</h2>
            <div className='mt-6 grid gap-4 sm:grid-cols-2'>
              <div className='rounded-xl border border-gray-100 bg-gray-50 p-5'>
                <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>Créée le</p>
                <p className='mt-2 text-base font-bold text-gray-900'>{formatDateTime(alert.created_at)}</p>
              </div>
              <div className='rounded-xl border border-gray-100 bg-gray-50 p-5'>
                <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>Coordonnées</p>
                <p className='mt-2 text-base font-bold text-gray-900'>
                  {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <p className='text-sm leading-relaxed text-gray-500'>
                {isDemo
                  ? 'Cette alerte est affichée en mode démonstration. Vous pouvez tester les actions sans impacter les données réelles.'
                  : 'Cette alerte provient des données réelles du système. Votre réponse sera immédiatement enregistrée si vous acceptez ou refusez la demande.'}
              </p>
            </div>
          </article>

          {!showHealthVerification ? (
            <article className='rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm'>
              <h2 className='text-xl font-extrabold text-gray-900'>Vérification Santé</h2>
              <p className='mt-3 text-sm text-gray-500 leading-relaxed'>
                Pour votre sécurité et celle du receveur, veuillez d’abord effectuer une vérification rapide de votre aptitude à donner.
              </p>

              <div className='mt-8 space-y-4'>
                <button
                  type='button'
                  onClick={() => void startHealthVerification()}
                  className='flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-base font-bold text-white transition-all shadow-md hover:bg-blue-700 hover:shadow-lg active:scale-95'
                >
                  <HeartPulse className='h-5 w-5' />
                  Commencer la vérification
                </button>

                <button
                  type='button'
                  onClick={() => void handleDecline()}
                  disabled={submitting}
                  className='flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-4 text-base font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {submitting ? <LoaderCircle className='h-5 w-5 animate-spin' /> : <XCircle className='h-5 w-5' />}
                  Refuser l’alerte
                </button>
              </div>

              <div className='mt-6 rounded-lg bg-blue-50 p-4 border border-blue-100'>
                <p className='text-xs leading-relaxed text-blue-700'>
                  Cette vérification rapide ne remplace pas un examen médical professionnel, mais garantit votre sécurité.
                </p>
              </div>
            </article>
          ) : (
            <article className='rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm'>
              <h2 className='text-xl font-extrabold text-gray-900'>Vérification Santé par IA</h2>
              <p className='mt-3 text-sm text-gray-500 leading-relaxed'>
                Répondez aux questions pour confirmer votre aptitude à donner.
              </p>

              <div className='mt-6 h-80 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50 p-4'>
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`mb-4 flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>
                        {msg.role === 'user' ? <User className='w-4 h-4' /> : <Bot className='w-4 h-4' />}
                      </div>
                      <div className={`p-3 rounded-xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'}`}>
                        <p className='text-sm leading-relaxed'>{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className='flex gap-3 justify-start mb-4'>
                    <div className='flex items-start gap-3 max-w-[85%] flex-row'>
                      <div className='w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0'>
                        <Bot className='w-4 h-4' />
                      </div>
                      <div className='p-3 rounded-xl bg-white text-gray-800 border border-gray-100 rounded-bl-sm'>
                        <LoaderCircle className='h-4 w-4 animate-spin' />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {isEligible === null && (
                <div className='mt-4 flex gap-2'>
                  <input
                    type='text'
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder='Répondez à la question...'
                    className='flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'
                    disabled={chatLoading}
                  />
                  <button
                    type='button'
                    onClick={sendChatMessage}
                    disabled={chatLoading || !chatInput.trim()}
                    className='px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <Send className='w-5 h-5' />
                  </button>
                </div>
              )}

              {isEligible !== null && (
                <div className='mt-6 space-y-4'>
                  <div className={`p-4 rounded-xl border ${isEligible ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-sm font-semibold ${isEligible ? 'text-emerald-800' : 'text-red-800'}`}>
                      {isEligible 
                        ? '✅ Vous êtes éligible pour donner !' 
                        : '❌ Malheureusement, vous n’êtes pas éligible pour le moment.'}
                    </p>
                  </div>

                  {isEligible ? (
                    <button
                      type='button'
                      onClick={() => void handleAccept()}
                      disabled={submitting}
                      className='flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-bold text-white transition-all shadow-md hover:bg-emerald-700 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {submitting ? <LoaderCircle className='h-5 w-5 animate-spin' /> : <CheckCircle2 className='h-5 w-5' />}
                      Accepter l’alerte
                    </button>
                  ) : (
                    <button
                      type='button'
                      onClick={() => navigate('/donor/dashboard')}
                      className='flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-4 text-base font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95'
                    >
                      <ArrowLeft className='h-5 w-5' />
                      Retour au tableau de bord
                    </button>
                  )}
                </div>
              )}
            </article>
          )}
        </section>
      </div>
    </div>
  )
}