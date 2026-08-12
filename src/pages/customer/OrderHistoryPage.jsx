import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'

export default function OrderHistoryPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [orders, setOrders] = useState([])

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('customer_order_history')
      .select('*')
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data || []))
  }, [profile?.id])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-ink">{t('customer.orderHistory')}</h1>
      <Card>
        <DataTable
          emptyMessage={t('customer.noOrders')}
          columns={[
            { key: 'order_id', header: '#' },
            { key: 'order_type', header: t('pos.orderType') },
            { key: 'total_amount', header: t('common.total'), render: (r) => `${r.total_amount} ${t('common.birr')}` },
            { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
            { key: 'created_at', header: t('common.date'), render: (r) => new Date(r.created_at).toLocaleDateString() }
          ]}
          rows={orders}
        />
      </Card>
    </div>
  )
}
