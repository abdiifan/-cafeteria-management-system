import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wifi, WifiOff } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Field from '../../components/common/Field'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import DataTable from '../../components/common/DataTable'

export default function WastePage() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const isAm = i18n.language?.startsWith('am')

  const [rawItems, setRawItems] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [log, setLog] = useState([])
  const [connected, setConnected] = useState(false)

  const [source, setSource] = useState('raw_ingredient')
  const [refId, setRefId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [{ data: raw }, { data: menu }, { data: recent }] = await Promise.all([
      supabase.from('items').select('id, name_en, name_am, unit'),
      supabase.from('menu_items').select('id, name_en, name_am'),
      supabase
        .from('waste_log')
        .select('*, items(name_en, name_am), menu_items(name_en, name_am)')
        .order('logged_at', { ascending: false })
        .limit(15)
    ])
    setRawItems(raw || [])
    setMenuItems(menu || [])
    setLog(recent || [])
  }, [])

  useEffect(() => {
    load()

    // Live updates so warehouse and kitchen see the same waste log update
    // instantly — a warehouse keeper checking stock loss doesn't have to
    // keep refreshing to see what kitchen just logged.
    const channel = supabase
      .channel('waste-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waste_log' }, () => load())
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))

    const poll = setInterval(load, 20000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [load])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      source,
      quantity: Number(quantity),
      reason: reason || null,
      logged_by: profile.id,
      item_id: source === 'raw_ingredient' ? refId : null,
      menu_item_id: source === 'finished_dish' ? refId : null
    }
    const { error } = await supabase.from('waste_log').insert(payload)
    setSaving(false)
    if (!error) {
      setRefId('')
      setQuantity('')
      setReason('')
      load()
    }
  }

  const options = source === 'raw_ingredient' ? rawItems : menuItems

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-ink">{t('kitchen.waste')}</h1>
        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-forestLight/20 text-forest' : 'bg-stone text-bark/50'}`}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connected ? t('kitchen.live') : t('kitchen.reconnecting')}
        </span>
      </div>

      <Card subtitle={t('kitchen.logWaste')}>
        <form onSubmit={submit} className="grid md:grid-cols-4 gap-x-4">
          <Field label={t('kitchen.wasteSource')}>
            <Select value={source} onChange={(e) => { setSource(e.target.value); setRefId('') }}>
              <option value="raw_ingredient">{t('kitchen.rawIngredient')}</option>
              <option value="finished_dish">{t('kitchen.finishedDish')}</option>
            </Select>
          </Field>
          <Field label={t('common.name')} required>
            <Select required value={refId} onChange={(e) => setRefId(e.target.value)}>
              <option value="">—</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {isAm ? o.name_am || o.name_en : o.name_en}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.quantity')} required>
            <Input type="number" step="0.01" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label={t('kitchen.reason')}>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="expired / spilled / burnt…" />
          </Field>
          <div className="md:col-span-4">
            <Button type="submit" disabled={saving}>
              {t('kitchen.logWaste')}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={t('kitchen.waste')}>
        <DataTable
          columns={[
            {
              key: 'name',
              header: t('common.name'),
              render: (r) =>
                r.source === 'raw_ingredient'
                  ? (isAm ? r.items?.name_am || r.items?.name_en : r.items?.name_en)
                  : (isAm ? r.menu_items?.name_am || r.menu_items?.name_en : r.menu_items?.name_en)
            },
            { key: 'quantity', header: t('common.quantity') },
            { key: 'reason', header: t('kitchen.reason') },
            { key: 'logged_at', header: t('common.date'), render: (r) => new Date(r.logged_at).toLocaleString() }
          ]}
          rows={log}
        />
      </Card>
    </div>
  )
}
