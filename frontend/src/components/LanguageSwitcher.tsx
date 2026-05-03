import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fr' ? 'en' : (i18n.language === 'en' ? 'ar' : 'fr')
    i18n.changeLanguage(nextLang)
  }

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center justify-center gap-2 px-3 py-2 text-xs tracking-widest uppercase font-semibold transition-all ${className}`}
      title={t('navbar.language')}
    >
      <Globe className="w-4 h-4" />
      <span className="hidden sm:inline">{t('navbar.language')}</span>
    </button>
  )
}
