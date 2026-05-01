import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  User,
  MapPin,
  CheckCircle,
  ChevronRight,
  Loader2,
  MessageCircle,
  X,
  Navigation,
  Heart,
  Send,
} from 'lucide-react'
import type { BloodType } from '../types'
import { auth as authApi, ai as aiApi } from '../services/api'
import type { ChatMessage } from '../services/api'
import { useApp } from '../context/AppContext'
import type { BackendUser } from '../context/AppContext'

const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const bloodTypeInfo: Record<BloodType, { compatible: string[]; rarity: string }> = {
  'O-': { compatible: ['Tous les groupes'], rarity: 'Universel — Très rare (7%)' },
  'O+': { compatible: ['O+', 'A+', 'B+', 'AB+'], rarity: 'Commun (38%)' },
  'A+': { compatible: ['A+', 'AB+'], rarity: 'Commun (34%)' },
  'A-': { compatible: ['A+', 'A-', 'AB+', 'AB-'], rarity: 'Rare (6%)' },
  'B+': { compatible: ['B+', 'AB+'], rarity: 'Peu commun (9%)' },
  'B-': { compatible: ['B+', 'B-', 'AB+', 'AB-'], rarity: 'Très rare (2%)' },
  'AB+': { compatible: ['AB+'], rarity: 'Receveur universel (3%)' },
  'AB-': { compatible: ['AB+', 'AB-'], rarity: 'Très rare (1%)' },
}

interface UIMessage {
  role: 'bot' | 'user'
  text: string
}

const steps = [
  { id: 1, label: "Profil", icon: User },
  { id: 2, label: "Groupe sanguin", icon: Heart },
  { id: 3, label: "Localisation", icon: MapPin },
]

export default function DonorRegistration() {
  const navigate = useNavigate()
  const { login } = useApp()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedBloodType, setSelectedBloodType] = useState<BloodType | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null)
  const [locating, setLocating] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<UIMessage[]>([])
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatTyping, setChatTyping] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    age: '',
    email: '',
    password: '',
  })

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleGeolocate = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: 'Position GPS détectée' })
        setLocating(false)
        toast.success('Position enregistrée avec succès !')
      },
      () => {
        setLocating(false)
        toast.error('Impossible d\'accéder à votre position. Vérifiez les permissions du navigateur.')
      }
    )
  }

  const openChat = () => {
    setChatOpen(true)
    if (chatMessages.length === 0) {
      const greeting = "Bonjour ! Je suis l'assistant IA d'Urgence-Sang. Pour vérifier votre aptitude au don, pouvez-vous vous déplacer maintenant ?"
      setChatMessages([{ role: 'bot', text: greeting }])
      setChatHistory([])
    }
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatTyping) return
    const text = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', text }])
    setChatTyping(true)

    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: text }]
    try {
      const res = await aiApi.chat(text, chatHistory, form.firstName, selectedBloodType ?? '')
      const botMsg = res.reply ?? "Je n'ai pas pu analyser votre réponse."
      setChatMessages((prev) => [...prev, { role: 'bot', text: botMsg }])
      setChatHistory([...newHistory, { role: 'assistant', content: botMsg }])
      if (res.eligible === false) {
        toast.error('Vous n\'êtes pas éligible au don pour le moment.')
      } else if (res.eligible === true) {
        toast.success('Vous êtes éligible ! ✅')
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'bot', text: 'Service IA indisponible. Veuillez réessayer.' }])
    } finally {
      setChatTyping(false)
    }
  }

  const canProceed = () => {
    if (currentStep === 1) return form.firstName && form.lastName && form.phone && form.age && form.email && form.password
    if (currentStep === 2) return selectedBloodType !== null
    if (currentStep === 3) return location !== null
    return true
  }

  const handleSubmit = async () => {
    if (!location || !selectedBloodType) return
    setSubmitting(true)
    try {
      const res = await authApi.registerDonor({
        email: form.email,
        password: form.password,
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        blood_type: selectedBloodType,
        latitude: location.lat,
        longitude: location.lng,
      })
      login(res.data.token, res.data.user as BackendUser)
      setDone(true)
      toast.success('Inscription réussie ! Bienvenue dans la famille Urgence-Sang 🎉')
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Erreur lors de l\'inscription')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 p-10 text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Heart className="w-12 h-12 text-rose-600 fill-rose-100" />
          </motion.div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Bienvenue, {form.firstName} !</h1>
          <p className="text-slate-500 mb-2">
            Vous êtes maintenant un <strong className="text-rose-600">Héros Urgence-Sang</strong>.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-xl text-rose-700 font-bold text-lg mb-6">
            <Heart className="w-5 h-5" />
            {selectedBloodType}
          </div>
          <p className="text-slate-400 text-sm mb-8">
            Activez votre disponibilité depuis votre dashboard pour commencer à recevoir des alertes.
          </p>
          <button
            onClick={() => navigate('/donor/dashboard')}
            className="w-full py-3.5 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-colors text-lg"
          >
            Accéder à mon dashboard
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-600 rounded-2xl mb-4 shadow-lg shadow-rose-200">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Devenir Donneur</h1>
          <p className="text-slate-500 mt-1">Créez votre profil héros en 3 étapes</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, i) => {
            const Icon = step.icon
            const done = currentStep > step.id
            const active = currentStep === step.id
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      done
                        ? 'bg-emerald-500 text-white'
                        : active
                        ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${active ? 'text-rose-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8"
          >
            {/* Step 1: Profile */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Votre profil</h2>
                <p className="text-slate-500 text-sm mb-6">Informations personnelles de base</p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prénom *</label>
                      <input
                        name="firstName"
                        value={form.firstName}
                        onChange={handleFormChange}
                        placeholder="Ahmed"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom *</label>
                      <input
                        name="lastName"
                        value={form.lastName}
                        onChange={handleFormChange}
                        placeholder="Benali"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email *</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleFormChange}
                      placeholder="ahmed@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mot de passe *</label>
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleFormChange}
                      placeholder="Minimum 8 caractères"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Téléphone *</label>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleFormChange}
                      placeholder="+212 6XX XX XX XX"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Âge *</label>
                    <input
                      name="age"
                      type="number"
                      value={form.age}
                      onChange={handleFormChange}
                      placeholder="25"
                      min="18"
                      max="70"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-400 mt-1">Le don de sang est autorisé entre 18 et 70 ans</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Blood Type */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Votre groupe sanguin</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Sélectionnez votre groupe dans la grille ci-dessous
                </p>

                <div className="grid grid-cols-4 gap-3 mb-6">
                  {bloodTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedBloodType(type)}
                      className={`py-4 rounded-2xl font-bold text-lg transition-all ${
                        selectedBloodType === type
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-200 scale-105'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-rose-300 hover:bg-rose-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {selectedBloodType && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-50 border border-rose-100 rounded-xl"
                  >
                    <p className="text-sm font-bold text-rose-800 mb-1">{selectedBloodType} — {bloodTypeInfo[selectedBloodType].rarity}</p>
                    <p className="text-sm text-rose-700">
                      Compatible avec : <strong>{bloodTypeInfo[selectedBloodType].compatible.join(', ')}</strong>
                    </p>
                  </motion.div>
                )}

                <button
                  onClick={openChat}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Je ne connais pas mon groupe sanguin — Obtenir de l'aide
                </button>
              </div>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Votre localisation</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Pour que l'IA puisse vous matcher avec les hôpitaux proches de chez vous
                </p>

                <button
                  onClick={handleGeolocate}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold rounded-2xl transition-all text-lg shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-0.5"
                >
                  {locating ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Localisation en cours...</>
                  ) : (
                    <><Navigation className="w-5 h-5" /> Me localiser maintenant</>
                  )}
                </button>

                {location && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl"
                  >
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-800 text-sm">Position enregistrée ✓</p>
                      <p className="text-emerald-600 text-xs mt-0.5">
                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    🔒 Votre position n'est partagée avec les hôpitaux qu'en cas d'alerte active.
                    Elle est chiffrée et supprimée après chaque session.
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">ou</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <button
                  onClick={() => {
                    setLocation({ lat: 33.5731, lng: -7.5898, address: 'Casablanca (saisie manuelle)' })
                    toast.info('Position définie sur Casablanca')
                  }}
                  className="mt-4 w-full py-3 text-slate-600 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors text-sm"
                >
                  Définir ma position manuellement
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => currentStep > 1 ? setCurrentStep((s) => s - 1) : navigate('/')}
            className="px-5 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
          >
            ← Retour
          </button>

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Continuer <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Inscription...</>
              ) : (
                <><Heart className="w-4 h-4" /> Finaliser l'inscription</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* AI Chatbot Modal */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setChatOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Chat header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-rose-600">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">Assistant IA — Urgence-Sang</p>
                    <p className="text-rose-200 text-xs">Conseiller en santé</p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="h-72 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-rose-600 text-white rounded-br-sm'
                          : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {chatTyping && (
                  <div className="flex justify-start">
                    <div className="px-4 py-2.5 bg-slate-100 rounded-2xl rounded-bl-sm text-slate-400 text-sm">...</div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Écrivez votre réponse..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={chatTyping}
                    className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center hover:bg-rose-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
