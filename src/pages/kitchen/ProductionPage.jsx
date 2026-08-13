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

export default function ProductionPage() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const isAm = i18n.language?.startsWith('am')

  const [menuItems, setMenuItems] = useState([])
  const [log, setLog] = useState([])
  const [menuItemId, setMenuItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    const [{ data: menu }, { data: recent }] = await Promise.all([
      supabase.from('menu_items').select('id, name_en, name_am').eq('is_active', true),
      supabase
        .from('production_log')
        .select('*, menu_items(name_en, name_am), profiles(full_name, full_name_am)')
        .order('produced_at', { ascending: false })
        .limit(15)
    ])
    setMenuItems(menu || [])
    setLog(recent || [])
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    // The DB trigger auto-deducts ingredients per recipe and writes the audit entry
    const { error } = await supabase.from('production_log').insert({
      menu_item_id: menuItemId,
      quantity_produced: Number(quantity),
      produced_by: profile.id
    })
    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMenuItemId('')
    setQuantity('')
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-ink">{t('kitchen.production')}</h1>

      <Card subtitle={t('kitchen.logProduction')}>
        <form onSubmit={submit} className="grid md:grid-cols-3 gap-x-4">
          <Field label={t('kitchen.menuItem')} required>
            <Select required value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)}>
              <option value="">—</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>
                  {isAm ? m.name_am || m.name_en : m.name_en}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('kitchen.quantityProduced')} required>
            <Input type="number" step="0.01" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full">
              {t('kitchen.logProduction')}
            </Button>
          </div>
          {message && <p className="text-sm text-clay md:col-span-3 mt-2">{message}</p>}
        </form>
      </Card>

      <Card title={t('kitchen.production')}>
        <DataTable
          columns={[
            { key: 'menu_item', header: t('kitchen.menuItem'), render: (r) => (isAm ? r.menu_items?.name_am || r.menu_items?.name_en : r.menu_items?.name_en) },
            { key: 'quantity_produced', header: t('kitchen.quantityProduced') },
            {
              key: 'produced_by',
              header: t('kitchen.requestedBy'),
              render: (r) => (isAm ? r.profiles?.full_name_am || r.profiles?.full_name : r.profiles?.full_name)
            },
            { key: 'produced_at', header: t('common.date'), render: (r) => new Date(r.produced_at).toLocaleString() }
          ]}
          rows={log}
        />
      </Card>
    </div>
  )
}
