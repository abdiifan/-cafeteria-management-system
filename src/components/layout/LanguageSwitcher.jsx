import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation()
  const { setLanguage } = useAuth()
  const current = i18n.language?.startsWith('am') ? 'am' : 'en'

  const choose = (lang) => {
    if (lang !== current) setLanguage(lang)
  }

  return (
    <div className={`inline-flex rounded-full border border-bark/20 bg-white/60 p-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
      <button
        onClick={() => choose('am')}
        className={`px-3 py-1 rounded-full font-medium transition-colors ${
          current === 'am' ? 'bg-forest text-parchment' : 'text-bark/70'
        }`}
        aria-pressed={current === 'am'}
      >
        አማ
      </button>
      <button
        onClick={() => choose('en')}
        className={`px-3 py-1 rounded-full font-medium transition-colors ${
          current === 'en' ? 'bg-forest text-parchment' : 'text-bark/70'
        }`}
        aria-pressed={current === 'en'}
      >
        EN
      </button>
    </div>
  )
}
