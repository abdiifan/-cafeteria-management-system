import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Field from '../../components/common/Field'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'

const emptyForm = {
  name_en: '', name_am: '', category_id: '', unit: 'kg', reorder_threshold: 0, is_perishable: false
}

export default function ItemsPage() {
  const { t, i18n } = useTranslation()
  const { role } = useAuth()
  const isAm = i18n.language?.startsWith('am')
  const canManage = ['super_admin'].includes(role)

  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [{ data: itemsData }, { data: catData }] = await Promise.all([
      supabase.from('items').select('*, item_categories(name_en, name_am)').order('name_en'),
      supabase.from('item_categories').select('*')
    ])
    setItems(itemsData || [])
    setCategories(catData || [])
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('items').insert({
      ...form,
      category_id: form.category_id || null,
      reorder_threshold: Number(form.reorder_threshold) || 0
    })
    setSaving(false)
    if (!error) {
      setOpen(false)
      setForm(emptyForm)
      load()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">{t('warehouse.items')}</h1>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> {t('warehouse.addItem')}
          </Button>
        )}
      </div>

      <Card>
        <DataTable
          columns={[
            { key: 'name', header: t('common.name'), render: (r) => (isAm ? r.name_am || r.name_en : r.name_en) },
            {
              key: 'category',
              header: t('warehouse.category'),
              render: (r) => (isAm ? r.item_categories?.name_am : r.item_categories?.name_en) || '—'
            },
            { key: 'current_stock', header: t('warehouse.currentStock'), render: (r) => `${r.current_stock} ${r.unit}` },
            { key: 'reorder_threshold', header: t('warehouse.reorderThreshold') },
            { key: 'average_cost', header: t('warehouse.averageCost'), render: (r) => `${r.average_cost} ${t('common.birr')}` },
            {
              key: 'is_perishable',
              header: t('warehouse.perishable'),
              render: (r) => (r.is_perishable ? '✓' : '—')
            }
          ]}
          rows={items}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('warehouse.addItem')}>
        <form onSubmit={submit}>
          <Field label={t('warehouse.itemNameEn')} required>
            <Input required value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          </Field>
          <Field label={t('warehouse.itemNameAm')}>
            <Input
              value={form.name_am}
              onChange={(e) => setForm({ ...form, name_am: e.target.value })}
              className="font-amharic"
            />
          </Field>
          <Field label={t('warehouse.category')}>
            <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {isAm ? c.name_am || c.name_en : c.name_en}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('common.unit')} required>
              <Input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </Field>
            <Field label={t('warehouse.reorderThreshold')}>
              <Input
                type="number"
                value={form.reorder_threshold}
                onChange={(e) => setForm({ ...form, reorder_threshold: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={form.is_perishable}
              onChange={(e) => setForm({ ...form, is_perishable: e.target.checked })}
            />
            {t('warehouse.perishable')}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
