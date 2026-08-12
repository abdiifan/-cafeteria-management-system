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
import StatCard from '../../components/common/StatCard'
import StatusBadge from '../../components/common/StatusBadge'
import { Wallet } from 'lucide-react'

export default function WalletPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [wallet, setWallet] = useState(null)
  const [requests, setRequests] = useState([])
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!profile?.id) return
    const [{ data: w }, { data: r }] = await Promise.all([
      supabase.from('wallets').select('*').eq('profile_id', profile.id).maybeSingle(),
      supabase.from('wallet_top_up_requests').select('*').eq('profile_id', profile.id).order('requested_at', { ascending: false })
    ])
    setWallet(w)
    setRequests(r || [])
  }

  useEffect(() => {
    load()
  }, [profile?.id])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('wallet_top_up_requests').insert({
      profile_id: profile.id,
      amount: Number(amount),
      method
    })
    setSaving(false)
    if (!error) {
      setAmount('')
      load()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-ink">{t('customer.wallet')}</h1>

      <StatCard icon={Wallet} label={t('customer.balance')} value={`${(wallet?.balance || 0).toLocaleString()} ${t('common.birr')}`} />

      <Card subtitle={t('customer.requestTopUp')}>
        <form onSubmit={submit} className="grid md:grid-cols-3 gap-x-4">
          <Field label={t('customer.topUpAmount')} required>
            <Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={t('customer.topUpMethod')}>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">{t('pos.cash')}</option>
              <option value="telebirr">{t('pos.telebirr')}</option>
              <option value="cbe_birr">{t('pos.cbe_birr')}</option>
              <option value="hellocash">{t('pos.hellocash')}</option>
              <option value="payroll_deduction">{t('pos.payroll_deduction')}</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full">
              {t('customer.requestTopUp')}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={t('customer.requestTopUp')}>
        <DataTable
          columns={[
            { key: 'amount', header: t('customer.topUpAmount'), render: (r) => `${r.amount} ${t('common.birr')}` },
            { key: 'method', header: t('customer.topUpMethod'), render: (r) => t(`pos.${r.method}`, r.method) },
            { key: 'status', header: t('customer.topUpStatus'), render: (r) => <StatusBadge status={r.status} /> },
            { key: 'requested_at', header: t('common.date'), render: (r) => new Date(r.requested_at).toLocaleDateString() }
          ]}
          rows={requests}
        />
      </Card>
    </div>
  )
}
