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

const emptyForm = {
  item_id: '', supplier_id: '', quantity_received: '', unit_cost: '', invoice_reference: '', expiry_date: ''
}

export default function StockInPage() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const isAm = i18n.language?.startsWith('am')

  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [recent, setRecent] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    const [{ data: i }, { data: s }, { data: r }] = await Promise.all([
      supabase.from('items').select('id, name_en, name_am, unit').order('name_en'),
      supabase.from('suppliers').select('id, name, name_am').eq('is_active', true).order('name'),
      supabase
        .from('stock_movements')
        .select('*, items(name_en, name_am)')
        .eq('movement_type', 'stock_in')
        .order('created_at', { ascending: false })
        .limit(10)
    ])
    setItems(i || [])
    setSuppliers(s || [])
    setRecent(r || [])
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    // 1. Record the batch (needed for expiry tracking + FIFO costing)
    const { data: batch, error: batchError } = await supabase
      .from('stock_batches')
      .insert({
        item_id: form.item_id,
        supplier_id: form.supplier_id || null,
        quantity_received: Number(form.quantity_received),
        quantity_remaining: Number(form.quantity_received),
        unit_cost: Number(form.unit_cost),
        invoice_reference: form.invoice_reference || null,
        expiry_date: form.expiry_date || null,
        received_by: profile.id
      })
      .select()
      .single()

    if (batchError) {
      setSaving(false)
      setMessage(batchError.message)
      return
    }

    // 2. Log the movement — the DB trigger keeps items.current_stock in sync and writes the audit entry
    const { error: moveError } = await supabase.from('stock_movements').insert({
      item_id: form.item_id,
      batch_id: batch.id,
      movement_type: 'stock_in',
      quantity: Number(form.quantity_received),
      reason: 'Delivery received',
      performed_by: profile.id
    })

    setSaving(false)
    if (moveError) {
      setMessage(moveError.message)
      return
    }
    setForm(emptyForm)
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-ink">{t('warehouse.stockIn')}</h1>

      <Card subtitle={t('warehouse.stockInSubtitle')}>
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-x-4">
          <Field label={t('warehouse.items')} required>
            <Select required value={form.item_id} onChange={(e) => setForm({ ...form, item_id: e.target.value })}>
              <option value="">—</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {isAm ? it.name_am || it.name_en : it.name_en} ({it.unit})
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('warehouse.supplier')}>
            <Select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {isAm ? s.name_am || s.name : s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('warehouse.quantityReceived')} required>
            <Input
              type="number"
              step="0.01"
              required
              value={form.quantity_received}
              onChange={(e) => setForm({ ...form, quantity_received: e.target.value })}
            />
          </Field>
          <Field label={t('warehouse.unitCost')} required>
            <Input
              type="number"
              step="0.01"
              required
              value={form.unit_cost}
              onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
            />
          </Field>
          <Field label={t('warehouse.invoiceRef')}>
            <Input
              value={form.invoice_reference}
              onChange={(e) => setForm({ ...form, invoice_reference: e.target.value })}
            />
          </Field>
          <Field label={t('warehouse.expiryDate')}>
            <Input
              type="date"
              value={form.expiry_date}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
            />
          </Field>

          {message && <p className="text-sm text-clay md:col-span-2 mb-3">{message}</p>}

          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {t('warehouse.receiveStock')}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={t('warehouse.movementHistory')}>
        <DataTable
          columns={[
            { key: 'item', header: t('common.name'), render: (r) => (isAm ? r.items?.name_am || r.items?.name_en : r.items?.name_en) },
            { key: 'quantity', header: t('common.quantity') },
            { key: 'created_at', header: t('common.date'), render: (r) => new Date(r.created_at).toLocaleDateString() }
          ]}
          rows={recent}
        />
      </Card>
    </div>
  )
}
