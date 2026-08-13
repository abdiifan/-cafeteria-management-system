import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Field from '../../components/common/Field'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import DataTable from '../../components/common/DataTable'

export default function StockCountPage() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const isAm = i18n.language?.startsWith('am')

  const [items, setItems] = useState([])
  const [report, setReport] = useState([])
  const [itemId, setItemId] = useState('')
  const [counted, setCounted] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [{ data: i }, { data: r }] = await Promise.all([
      supabase.from('items').select('id, name_en, name_am, unit'),
      supabase.from('stock_reconciliation_report').select('*')
    ])
    setItems(i || [])
    setReport(r || [])
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    // system_quantity_at_count is filled server-side by the before-insert trigger
    const { error } = await supabase.from('stock_counts').insert({
      item_id: itemId,
      counted_quantity: Number(counted),
      system_quantity_at_count: 0,
      counted_by: profile.id,
      notes: notes || null
    })
    setSaving(false)
    if (!error) {
      setItemId('')
      setCounted('')
      setNotes('')
      load()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-ink">{t('warehouse.stockCountTitle')}</h1>

      <Card subtitle={t('warehouse.stockCountSubtitle')}>
        <form onSubmit={submit} className="grid md:grid-cols-3 gap-x-4">
          <Field label={t('warehouse.items')} required>
            <Select required value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">—</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {isAm ? it.name_am || it.name_en : it.name_en} ({it.unit})
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('warehouse.countedQuantity')} required>
            <Input type="number" step="0.01" required value={counted} onChange={(e) => setCounted(e.target.value)} />
          </Field>
          <Field label={t('common.notes')}>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="md:col-span-3">
            <Button type="submit" disabled={saving}>
              {t('warehouse.submitCount')}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={t('audit.stockReconciliation')}>
        <DataTable
          columns={[
            { key: 'name', header: t('common.name'), render: (r) => (isAm ? r.name_am || r.name_en : r.name_en) },
            { key: 'counted_quantity', header: t('warehouse.countedQuantity') },
            { key: 'system_quantity_at_count', header: t('warehouse.systemQuantity') },
            {
              key: 'variance',
              header: t('warehouse.variance'),
              render: (r) => (
                <span className={r.flagged ? 'text-clay font-semibold' : ''}>{r.variance}</span>
              )
            }
          ]}
          rows={report}
        />
      </Card>
    </div>
  )
}
