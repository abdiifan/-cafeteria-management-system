export default function StatCard({ label, value, hint, tone = 'default', icon: Icon }) {
  const tones = {
    default: 'border-bark/10',
    warn: 'border-gold/60 bg-goldSoft/30',
    danger: 'border-clay/50 bg-clay/5'
  }
  return (
    <div className={`rounded-card border bg-white/70 p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-bark/60">{label}</span>
        {Icon && <Icon size={16} className="text-bark/40" />}
      </div>
      <div className="font-display text-2xl mt-1 text-ink">{value}</div>
      {hint && <div className="text-xs text-bark/60 mt-1">{hint}</div>}
    </div>
  )
}
