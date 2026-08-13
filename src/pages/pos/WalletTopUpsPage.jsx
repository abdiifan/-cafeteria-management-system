import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import Field from '../../components/common/Field'
import Input from '../../components/common/Input'

// Reviews wallet_top_up_requests submitted from the customer Wallet page.
// Approve/reject go through Postgres functions (not a plain client-side
// UPDATE) so the wallet credit and the status change always happen together
// — see step9_wallet_topup_approvals.sql for why.
export default function WalletTopUpsPage() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language?.startsWith('am')

  const [pending, setPending] = useState([])
  const [recent, setRecent] = useState([])
  const [connected, setConnected] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [rejecting, setRejecting] = useState(null) // request row, or null
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase
        .from('wallet_top_up_requests')
        .select('*, profiles(full_name, full_name_am, email)')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true }),
      supabase
        .from('wallet_top_up_requests')
        .select('*, profiles(full_name, full_name_am, email)')
        .neq('status', 'pending')
        .order('reviewed_at', { ascending: false })
        .limit(25)
    ])
    setPending(p || [])
    setRecent(r || [])
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('wallet-topups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_top_up_requests' }, () => load())
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    const poll = setInterval(load, 20000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [load])

  const nameFor = (row) => (isAm && row.profiles?.full_name_am) || row.profiles?.full_name || row.profiles?.email || '—'

  const approve = async (row) => {
    setBusyId(row.id)
    setError('')
    const { error: rpcError } = await supabase.rpc('approve_topup_request', { request_id: row.id })
    setBusyId(null)
    if (rpcError) setError(rpcError.message)
    else load()
  }

  const openReject = (row) => {
    setRejecting(row)
    setNote('')
    setError('')
  }

  const confirmReject = async () => {
    if (!rejecting) return
    setBusyId(rejecting.id)
    setError('')
    const { error: rpcError } = await supabase.rpc('reject_topup_request', {
      request_id: rejecting.id,
      note: note || null
    })
    setBusyId(null)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setRejecting(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-ink">{t('customer.walletTopups')}</h1>
        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-forestLight/20 text-forest' : 'bg-stone text-bark/50'}`}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connected ? t('kitchen.live') : t('kitchen.reconnecting')}
        </span>
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}

      <Card title={t('customer.pendingTopups')} subtitle={t('customer.pendingTopupsSubtitle')}>
        <DataTable
          emptyMessage={t('customer.noPendingTopups')}
          columns={[
            { key: 'customer', header: t('common.name'), render: (r) => nameFor(r) },
            { key: 'amount', header: t('customer.topUpAmount'), render: (r) => `${Number(r.amount).toLocaleString()} ${t('common.birr')}` },
            { key: 'method', header: t('customer.topUpMethod'), render: (r) => t(`pos.${r.method}`, r.method) },
            { key: 'requested_at', header: t('common.date'), render: (r) => new Date(r.requested_at).toLocaleString() },
            {
              key: 'actions',
              header: t('common.actions'),
              render: (r) => (
                <div className="flex gap-2">
                  <Button size="sm" disabled={busyId === r.id} onClick={() => approve(r)}>
                    <Check size={14} /> {t('status.approved')}
                  </Button>
                  <Button size="sm" variant="danger" disabled={busyId === r.id} onClick={() => openReject(r)}>
                    <X size={14} /> {t('status.rejected')}
                  </Button>
                </div>
              )
            }
          ]}
          rows={pending}
        />
      </Card>

      <Card title={t('customer.recentDecisions')}>
        <DataTable
          emptyMessage={t('common.noResults')}
          columns={[
            { key: 'customer', header: t('common.name'), render: (r) => nameFor(r) },
            { key: 'amount', header: t('customer.topUpAmount'), render: (r) => `${Number(r.amount).toLocaleString()} ${t('common.birr')}` },
            { key: 'method', header: t('customer.topUpMethod'), render: (r) => t(`pos.${r.method}`, r.method) },
            { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
            { key: 'reviewed_at', header: t('customer.reviewedAt'), render: (r) => (r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : '—') },
            { key: 'review_note', header: t('customer.reviewNote'), render: (r) => r.review_note || '—' }
          ]}
          rows={recent}
        />
      </Card>

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={t('customer.rejectTopup')}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" disabled={busyId === rejecting?.id} onClick={confirmReject}>
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <Field label={t('customer.reviewNote')}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('customer.reviewNoteHint')} />
        </Field>
      </Modal>
    </div>
  )
}
