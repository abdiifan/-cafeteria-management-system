import { useTranslation } from 'react-i18next'
import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import LanguageSwitcher from './LanguageSwitcher'

export default function Topbar({ onMenuClick }) {
  const { t } = useTranslation()
  const { profile, role, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-30 bg-parchment/90 backdrop-blur border-b border-bark/10 px-4 md:px-6 py-3 flex items-center justify-between">
      <button className="md:hidden p-2 -ml-2" onClick={onMenuClick} aria-label="Menu">
        <Menu size={22} />
      </button>

      <div className="hidden md:block">
        <p className="text-sm text-bark/60">{t('app.tagline')}</p>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-medium text-ink">{profile?.preferred_language === 'am' ? profile?.full_name_am || profile?.full_name : profile?.full_name}</span>
          <span className="text-xs text-bark/60">{t(`roles.${role}`, role)}</span>
        </div>
        <button
          onClick={signOut}
          className="p-2 rounded-card text-bark/60 hover:bg-stone hover:text-clay transition-colors"
          title={t('common.logout')}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
