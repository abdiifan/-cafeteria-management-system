import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import Field from '../../components/common/Field'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'

export default function TaxSettingsPage() {
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
        vat_registered: form.vat_registered,
        vat_rate: Number(form.vat_rate),
        business_tin: form.business_tin || null,
        srm_required: form.srm_required,
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
      <h1 className="font-display text-2xl text-ink">{t('admin.taxVat')}</h1>

      <Card subtitle={t('admin.taxVatSubtitle')}>
        <form onSubmit={submit}>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={form.vat_registered}
              onChange={(e) => setForm({ ...form, vat_registered: e.target.checked })}
            />
            {t('admin.vatRegistered')}
          </label>

          <Field label={t('admin.vatRate')} required>
            <Input
              type="number"
              step="0.01"
              required
              value={form.vat_rate}
              onChange={(e) => setForm({ ...form, vat_rate: e.target.value })}
            />
          </Field>

          <Field label={t('admin.businessTin')}>
            <Input value={form.business_tin || ''} onChange={(e) => setForm({ ...form, business_tin: e.target.value })} />
          </Field>

          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={form.srm_required}
              onChange={(e) => setForm({ ...form, srm_required: e.target.checked })}
            />
            {t('admin.srmRequired')}
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

      <p className="text-xs text-bark/50">{t('admin.taxVatDisclaimer')}</p>
    </div>
  )
}
