import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Droplets, Loader2, Eye, EyeOff } from 'lucide-react'
import { auth as authApi } from '../services/api'
import { useApp } from '../context/AppContext'
import type { BackendUser } from '../context/AppContext'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useApp()
  const { t } = useTranslation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      toast.error(t('login.fill_all_fields'))
      return
    }
    setLoading(true)
    try {
      console.log('[LoginPage] Attempting login...')
      const res = await authApi.login({ email: form.email, password: form.password })
      console.log('[LoginPage] Login response:', res)
      console.log('[LoginPage] Token received:', res.data.token.substring(0, 20) + '...')
      console.log('[LoginPage] User received:', res.data.user)
      
      login(res.data.token, res.data.user as BackendUser)
      
      console.log('[LoginPage] After login() call, checking localStorage...')
      console.log('[LoginPage] Token in localStorage:', localStorage.getItem('token')?.substring(0, 20) + '...')
      
      toast.success(`${t('login.welcome_back')} ${res.data.user.first_name} !`)
      const role = res.data.user.role
      if (role === 'donor') navigate('/donor/dashboard')
      else if (role === 'hospital') navigate('/hospital/dashboard')
      else navigate('/')
    } catch (err: unknown) {
      console.error('[LoginPage] Login error:', err)
      toast.error((err as Error).message ?? t('login.invalid_credentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 pt-16 sm:pt-4 relative">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <LanguageSwitcher className="text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm border border-slate-200 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4 sm:mb-6">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-rose-600 flex items-center justify-center rounded-lg">
              <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-slate-900">
              Urgence<span className="text-rose-600">-Sang</span>
            </span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">{t('login.title')}</h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm">{t('login.subtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('login.email')} *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t('login.email_placeholder')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('login.password')} *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={t('login.password_placeholder')}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {t('login.logging_in')}</>
              ) : (
                t('login.login')
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-3">
            <p className="text-sm text-slate-500">
              {t('login.no_account')}
            </p>
            <div className="flex gap-3">
              <Link
                to="/donor/register"
                className="flex-1 py-2.5 text-center text-sm font-semibold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors"
              >
                {t('login.donor')}
              </Link>
              <Link
                to="/hospital/register"
                className="flex-1 py-2.5 text-center text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                {t('login.hospital')}
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
