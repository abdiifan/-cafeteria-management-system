import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import Field from '../../components/common/Field'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'

export default function RequisitionsPage() {
  const { t, i18n } = useTranslation()
  const { profile, role } = useAuth()
  const isAm = i18n.language?.startsWith('am')
  const canRequest = ['kitchen_staff', 'super_admin'].includes(role)
  const canDecide = ['warehouse_keeper', 'super_admin'].includes(role)

  const [requisitions, setRequisitions] = useState([])
  const [rawItems, setRawItems] = useState([])
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState([{ item_id: '', quantity_requested: '' }])
  const [notes, setNotes] = useState('')
  const [connected, setConnected] = useState(false)

  const load = useCallback(async () => {
    const [{ data: reqs }, { data: items }] = await Promise.all([
      supabase
        .from('requisitions')
        .select('*, profiles!requisitions_requested_by_fkey(full_name, full_name_am), requisition_items(*, items(name_en, name_am, unit))')
        .order('created_at', { ascending: false }),
      supabase.from('items').select('id, name_en, name_am, unit')
    ])
    setRequisitions(reqs || [])
    setRawItems(items || [])
  }, [])

  useEffect(() => {
    load()

    // Live updates so a warehouse keeper sees a kitchen request the moment
    // it's submitted (and vice versa when it's decided), without a manual
    // refresh. Refetching on any change keeps requisition_items in sync too.
    const channel = supabase
      .channel('requisitions-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requisitions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requisition_items' }, () => load())
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))

    // Fallback poll in case the realtime socket drops silently.
    const poll = setInterval(load, 20000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [load])

  const addLine = () => setLines([...lines, { item_id: '', quantity_requested: '' }])
  const updateLine = (i, patch) => setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const submit = async (e) => {
    e.preventDefault()
    const { data: req, error } = await supabase
      .from('requisitions')
      .insert({ requested_by: profile.id, notes: notes || null })
      .select()
      .single()
    if (error) return

    const rows = lines
      .filter((l) => l.item_id && l.quantity_requested)
      .map((l) => ({ requisition_id: req.id, item_id: l.item_id, quantity_requested: Number(l.quantity_requested) }))
    await supabase.from('requisition_items').insert(rows)

    setOpen(false)
    setLines([{ item_id: '', quantity_requested: '' }])
    setNotes('')
    load()
  }

  const decide = async (req, status) => {
    const { error } = await supabase
      .from('requisitions')
      .update({ status, decided_by: profile.id, decided_at: new Date().toISOString() })
      .eq('id', req.id)
    if (error) return

    // Fulfilling a requisition is the actual warehouse -> kitchen handoff: the
    // stock has to physically leave the warehouse now, so — same as StockInPage
    // does for deliveries — we log it to stock_movements. The DB trigger picks
    // this up to decrement items.current_stock and write the audit entry.
    // Without this, "fulfilled" was just a status label and warehouse stock
    // never actually moved.
    if (status === 'fulfilled') {
      const itemLines = req.requisition_items || []
      if (itemLines.length > 0) {
        const rows = itemLines.map((ri) => ({
          item_id: ri.item_id,
          movement_type: 'requisition_out',
          quantity: ri.quantity_requested,
          reason: `Requisition #${req.id} fulfilled to kitchen`,
          performed_by: profile.id
        }))
        const { error: moveError } = await supabase.from('stock_movements').insert(rows)
        if (moveError) {
          // Roll the status back so the requisition isn't silently marked
          // fulfilled while the warehouse stock was never actually moved.
          await supabase
            .from('requisitions')
            .update({ status: 'approved', decided_by: profile.id, decided_at: new Date().toISOString() })
            .eq('id', req.id)
          load()
          return
        }
      }
    }

    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-ink">{t('kitchen.requisitions')}</h1>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-forestLight/20 text-forest' : 'bg-stone text-bark/50'}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? t('kitchen.live') : t('kitchen.reconnecting')}
          </span>
          {canRequest && (
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> {t('kitchen.newRequisition')}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <DataTable
          columns={[
            { key: 'id', header: '#' },
            {
              key: 'requested_by',
              header: t('kitchen.requestedBy'),
              render: (r) => (isAm ? r.profiles?.full_name_am || r.profiles?.full_name : r.profiles?.full_name)
            },
            {
              key: 'items',
              header: t('kitchen.requestItems'),
              render: (r) =>
                r.requisition_items
                  ?.map((ri) => `${isAm ? ri.items?.name_am || ri.items?.name_en : ri.items?.name_en} (${ri.quantity_requested}${ri.items?.unit})`)
                  .join(', ')
            },
            { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
            {
              key: 'actions',
              header: t('common.actions'),
              render: (r) =>
                canDecide && r.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide(r, 'approved')}>
                      {t('kitchen.approve')}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => decide(r, 'rejected')}>
                      {t('kitchen.reject')}
                    </Button>
                  </div>
                ) : canDecide && r.status === 'approved' ? (
                  <Button size="sm" variant="gold" onClick={() => decide(r, 'fulfilled')}>
                    {t('kitchen.fulfill')}
                  </Button>
                ) : null
            }
          ]}
          rows={requisitions}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('kitchen.newRequisition')}>
        <form onSubmit={submit}>
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Select
                required
                value={line.item_id}
                onChange={(e) => updateLine(i, { item_id: e.target.value })}
              >
                <option value="">—</option>
                {rawItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {isAm ? it.name_am || it.name_en : it.name_en}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                step="0.01"
                required
                placeholder={t('common.quantity')}
                value={line.quantity_requested}
                onChange={(e) => updateLine(i, { quantity_requested: e.target.value })}
              />
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={addLine} className="mb-4">
            <Plus size={14} /> {t('kitchen.addIngredient')}
          </Button>
          <Field label={t('common.notes')}>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.submit')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
