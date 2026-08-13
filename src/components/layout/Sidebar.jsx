import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { ChevronDown, Coffee } from 'lucide-react'
import { NAV_SECTIONS } from './navConfig'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar({ open, onNavigate }) {
  const { t } = useTranslation()
  const { role } = useAuth()
  const [expanded, setExpanded] = useState(() => new Set(NAV_SECTIONS.map((s) => s.key)))

  // A child with no `roles` of its own inherits the parent section's roles.
  const childVisible = (child, section) =>
    role === 'super_admin' || (child.roles || section.roles).includes(role)

  const visible = NAV_SECTIONS.filter((s) => role && s.roles.includes(role)).map((s) =>
    s.children ? { ...s, children: s.children.filter((c) => childVisible(c, s)) } : s
  )

  const toggle = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-card text-sm transition-colors ${
      isActive ? 'bg-forest text-parchment' : 'text-stone hover:bg-white/10'
    }`

  return (
    <aside
      className={`bg-forest text-parchment w-64 shrink-0 flex-col fixed md:static inset-y-0 left-0 z-40 transition-transform md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } flex`}
    >
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <Coffee size={22} className="text-gold" />
        <span className="font-display text-lg leading-tight">{t('app.name')}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visible.map((section) => {
          if (!section.children) {
            const Icon = section.icon
            return (
              <NavLink key={section.key} to={section.path} end className={linkClasses} onClick={onNavigate}>
                <Icon size={18} />
                {t(section.labelKey)}
              </NavLink>
            )
          }
          const isOpen = expanded.has(section.key)
          const Icon = section.icon
          return (
            <div key={section.key}>
              <button
                onClick={() => toggle(section.key)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-card text-sm text-stone/90 hover:bg-white/10"
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={18} />
                  {t(section.labelKey)}
                </span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                  {section.children.map((child) => (
                    <NavLink key={child.path} to={child.path} className={linkClasses} onClick={onNavigate}>
                      {t(child.labelKey)}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
