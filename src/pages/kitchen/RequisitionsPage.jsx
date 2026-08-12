import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
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

  const load = async () => {
    const [{ data: reqs }, { data: items }] = await Promise.all([
      supabase
        .from('requisitions')
        .select('*, profiles!requisitions_requested_by_fkey(full_name, full_name_am), requisition_items(*, items(name_en, name_am, unit))')
        .order('created_at', { ascending: false }),
      supabase.from('items').select('id, name_en, name_am, unit')
    ])
    setRequisitions(reqs || [])
    setRawItems(items || [])
  }

  useEffect(() => {
    load()
  }, [])

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
    await supabase
      .from('requisitions')
      .update({ status, decided_by: profile.id, decided_at: new Date().toISOString() })
      .eq('id', req.id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">{t('kitchen.requisitions')}</h1>
        {canRequest && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> {t('kitchen.newRequisition')}
          </Button>
        )}
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
