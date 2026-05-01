import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Droplets, LogOut, User, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { useTranslation } from 'react-i18next'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, logout } = useApp()
  const { t, i18n } = useTranslation()
  const isLanding = location.pathname === '/'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fr' ? 'en' : (i18n.language === 'en' ? 'ar' : 'fr');
    i18n.changeLanguage(nextLang);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isDark = isLanding && !scrolled

  const publicLinks = [
    { label: t('navbar.how_it_works'), href: '/#how-it-works' },
    { label: t('navbar.impact'), href: '/#impact' },
    { label: t('navbar.login'), href: '/login' },
  ]

  const navLinks = currentUser
    ? [
      { label: t('navbar.how_it_works'), href: '/#how-it-works' },
      { label: t('navbar.impact'), href: '/#impact' },
      { label: t('navbar.dashboard'), href: currentUser.role === 'donor' ? '/donor/dashboard' : '/hospital/dashboard' },
    ]
    : publicLinks

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isDark
          ? 'bg-[#09090b]/65 backdrop-blur-md border-b border-white/10'
          : 'bg-[#0b0b10]/92 backdrop-blur-md border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 bg-rose-600 flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
              Urgence<span className="text-white">-Sang</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-3 ml-10 flex-1">
            {navLinks.map((link) => (
              link.href.startsWith('/#') ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 -mx-1 text-[11px] leading-none tracking-[0.14em] uppercase font-medium text-zinc-300 hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-3 py-2 -mx-1 text-[11px] leading-none tracking-[0.14em] uppercase font-medium text-zinc-300 hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-widest uppercase font-semibold text-zinc-300 hover:text-white transition-colors duration-200"
            >
              <Globe className="w-3.5 h-3.5" />
              {t('navbar.language')}
            </button>
            {currentUser ? (
              <>
                <Link
                  to={currentUser.role === 'donor' ? '/donor/dashboard' : '/hospital/dashboard'}
                  className="flex items-center gap-2 px-4 py-2 text-[11px] tracking-widest uppercase font-semibold text-zinc-300 border border-zinc-700 hover:border-white hover:text-white transition-all duration-200"
                >
                  <User className="w-3.5 h-3.5" />
                  {currentUser.first_name}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-[11px] tracking-widest uppercase font-semibold text-zinc-400 hover:text-white transition-colors duration-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t('navbar.logout')}
                </button>
              </>
            ) : null}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="md:hidden bg-[#09090b] border-t border-zinc-800 overflow-hidden"
          >
            <div className="px-6 py-6 space-y-4">
              {navLinks.map((link) => (
                link.href.startsWith('/#') ? (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-xs tracking-[0.2em] uppercase font-medium text-zinc-400 hover:text-white transition-colors py-1"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-xs tracking-[0.2em] uppercase font-medium text-zinc-400 hover:text-white transition-colors py-1"
                  >
                    {link.label}
                  </Link>
                )
              ))}
              {currentUser && (
                <div className="pt-4 border-t border-zinc-800 space-y-3">
                  <button
                    onClick={() => { setMobileOpen(false); handleLogout() }}
                    className="flex w-full items-center justify-center py-3.5 text-xs tracking-widest uppercase font-semibold text-zinc-200 border border-zinc-700 hover:border-white hover:text-white transition-all"
                  >
                    {t('navbar.logout')}
                  </button>
                </div>
              )}
              <div className="pt-4 border-t border-zinc-800">
                <button
                  onClick={toggleLanguage}
                  className="flex w-full items-center justify-center gap-2 py-3.5 text-xs tracking-widest uppercase font-semibold text-zinc-200 border border-zinc-700 hover:border-white hover:text-white transition-all"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {t('navbar.language')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
