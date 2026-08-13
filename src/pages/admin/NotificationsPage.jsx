import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import Field from '../../components/common/Field'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'

export default function NotificationsPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('system_settings').select('*').eq('id', true).single()
    setForm(data)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    const { error } = await supabase
      .from('system_settings')
      .update({
        low_stock_alerts_enabled: form.low_stock_alerts_enabled,
        expiry_alert_days: Number(form.expiry_alert_days),
        pending_approval_alerts_enabled: form.pending_approval_alerts_enabled,
        updated_by: profile.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', true)
    setSaving(false)
    if (!error) setSuccess(true)
  }

  if (!form) return <p className="text-sm text-bark/50">{t('common.loading')}</p>

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="font-display text-2xl text-ink">{t('admin.notifications')}</h1>

      <Card subtitle={t('admin.notificationsSubtitle')}>
        <form onSubmit={submit}>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={form.low_stock_alerts_enabled}
              onChange={(e) => setForm({ ...form, low_stock_alerts_enabled: e.target.checked })}
            />
            {t('admin.lowStockAlertsEnabled')}
          </label>

          <Field label={t('admin.expiryAlertDays')}>
            <Input
              type="number"
              min="0"
              value={form.expiry_alert_days}
              onChange={(e) => setForm({ ...form, expiry_alert_days: e.target.value })}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={form.pending_approval_alerts_enabled}
              onChange={(e) => setForm({ ...form, pending_approval_alerts_enabled: e.target.checked })}
            />
            {t('admin.pendingApprovalAlertsEnabled')}
          </label>

          {success && (
            <p className="text-sm text-forest mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> {t('admin.settingsSaved')}
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? t('settings.updating') : t('common.save')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
