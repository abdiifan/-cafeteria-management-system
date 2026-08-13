import { useTranslation } from 'react-i18next'

const TONES = {
  pending: 'bg-goldSoft text-bark',
  approved: 'bg-forestLight/20 text-forest',
  fulfilled: 'bg-forestLight/20 text-forest',
  completed: 'bg-forestLight/20 text-forest',
  ready: 'bg-forestLight/20 text-forest',
  rejected: 'bg-clay/15 text-clay',
  cancelled: 'bg-clay/15 text-clay',
  placed: 'bg-goldSoft text-bark',
  preparing: 'bg-goldSoft text-bark',
  scheduled: 'bg-mist/20 text-bark'
}

export default function StatusBadge({ status }) {
  const { t } = useTranslation()
  const tone = TONES[status] || 'bg-stone text-bark'
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${tone}`}>
      {t(`status.${status}`, status)}
    </span>
  )
}
