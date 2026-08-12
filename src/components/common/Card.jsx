export default function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <div className={`bg-white/70 border border-bark/10 rounded-card p-5 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            {title && <h3 className="font-display text-lg text-ink">{title}</h3>}
            {subtitle && <p className="text-sm text-bark/70 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}
