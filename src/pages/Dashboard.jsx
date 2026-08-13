import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, ClipboardList, TrendingUp, Wallet, UtensilsCrossed, Landmark } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import StatCard from '../components/common/StatCard'
import DataTable from '../components/common/DataTable'
import StatusBadge from '../components/common/StatusBadge'

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { profile, role } = useAuth()
  const isAm = i18n.language?.startsWith('am')

  const [lowStock, setLowStock] = useState([])
  const [expiring, setExpiring] = useState([])
  const [todaySales, setTodaySales] = useState(null)
  const [pendingReqs, setPendingReqs] = useState(0)
  const [wallet, setWallet] = useState(null)
  const [payrollFunded, setPayrollFunded] = useState(0)
  const [myOrders, setMyOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const canSeeWarehouse = ['warehouse_keeper', 'super_admin', 'auditor'].includes(role)
  const canSeeKitchen = ['kitchen_staff', 'super_admin', 'auditor'].includes(role)
  const canSeeSales = ['cashier', 'super_admin', 'auditor'].includes(role)
  // Requisitions are a shared warehouse<->kitchen workflow: kitchen staff see the
  // count because they raised it, warehouse keepers see it because they act on it.
  const canSeeRequisitions = canSeeKitchen || canSeeWarehouse

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const tasks = []

      if (canSeeWarehouse) {
        tasks.push(
          supabase.from('low_stock_items').select('*').then(({ data }) => mounted && setLowStock(data || [])),
          supabase.from('expiring_soon_batches').select('*').then(({ data }) => mounted && setExpiring(data || []))
        )
      }
      if (canSeeRequisitions) {
        tasks.push(
          supabase
            .from('requisitions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
            .then(({ count }) => mounted && setPendingReqs(count || 0))
        )
      }
      if (canSeeSales) {
        tasks.push(
          supabase
            .from('daily_sales_summary')
            .select('*')
            .order('sales_date', { ascending: false })
            .limit(1)
            .then(({ data }) => mounted && setTodaySales(data?.[0] || null))
        )
      }
      if (profile?.id) {
        tasks.push(
          supabase
            .from('wallets')
            .select('balance')
            .eq('profile_id', profile.id)
            .maybeSingle()
            .then(({ data }) => mounted && setWallet(data)),
          supabase
            .from('customer_order_history')
            .select('*')
            .eq('customer_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(5)
            .then(({ data }) => mounted && setMyOrders(data || [])),
          // Wallet money can come from cash, mobile money, or a payroll
          // deduction (salary). This adds up just the payroll-sourced
          // portion so the person can see how much of their current
          // balance — and history — has come out of their salary.
          supabase
            .from('wallet_transactions')
            .select('amount')
            .eq('profile_id', profile.id)
            .eq('type', 'topup')
            .eq('method', 'payroll_deduction')
            .then(({ data }) =>
              mounted && setPayrollFunded((data || []).reduce((sum, r) => sum + Number(r.amount), 0))
            )
        )
      }

      await Promise.all(tasks)
      if (mounted) setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [profile?.id, canSeeWarehouse, canSeeKitchen, canSeeSales, canSeeRequisitions])

  const displayName = (isAm && profile?.full_name_am) || profile?.full_name || ''

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl md:text-3xl text-ink">
          {t('dashboard.greeting', { name: displayName })}
        </h1>
        {profile?.id && (
          <Link
            to="/account/order"
            className="inline-flex items-center justify-center gap-2 rounded-card font-semibold transition-colors px-4 py-2.5 text-sm bg-forest text-parchment hover:bg-forestLight"
          >
            <UtensilsCrossed size={16} />
            {t('customer.orderNow')}
          </Link>
        )}
      </div>

      {profile?.id && (
        <p className="text-sm text-bark/60 -mt-4">{t('dashboard.howItWorks')}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {canSeeSales && (
          <StatCard
            icon={TrendingUp}
            label={t('dashboard.todaySales')}
            value={`${(todaySales?.total_revenue || 0).toLocaleString()} ${t('common.birr')}`}
            hint={`${todaySales?.total_orders || 0} ${t('nav.orderHistory')}`}
          />
        )}
        {canSeeWarehouse && (
          <StatCard
            icon={AlertTriangle}
            label={t('dashboard.lowStockAlerts')}
            value={lowStock.length}
            tone={lowStock.length > 0 ? 'warn' : 'default'}
          />
        )}
        {canSeeWarehouse && (
          <StatCard
            icon={Clock}
            label={t('dashboard.expiringSoon')}
            value={expiring.length}
            tone={expiring.length > 0 ? 'danger' : 'default'}
          />
        )}
        {canSeeRequisitions && (
          <StatCard icon={ClipboardList} label={t('dashboard.pendingRequisitions')} value={pendingReqs} />
        )}
        {wallet && (
          <StatCard
            icon={Wallet}
            label={t('dashboard.walletBalance')}
            value={`${(wallet.balance || 0).toLocaleString()} ${t('common.birr')}`}
            hint={t('customer.balanceHint')}
          />
        )}
        {wallet && payrollFunded > 0 && (
          <StatCard
            icon={Landmark}
            label={t('customer.fundedByPayroll')}
            value={`${payrollFunded.toLocaleString()} ${t('common.birr')}`}
            hint={t('customer.fundedByPayrollHint')}
          />
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {canSeeWarehouse && (
          <Card title={t('dashboard.lowStockAlerts')}>
            <DataTable
              emptyMessage={t('warehouse.lowStockEmpty')}
              columns={[
                { key: 'name', header: t('common.name'), render: (r) => (isAm && r.name_am) || r.name_en },
                { key: 'current_stock', header: t('warehouse.currentStock') },
                { key: 'reorder_threshold', header: t('warehouse.reorderThreshold') }
              ]}
              rows={lowStock}
            />
          </Card>
        )}

        {profile?.id && (
          <Card title={t('dashboard.recentOrders')}>
            <DataTable
              emptyMessage={t('customer.noOrders')}
              columns={[
                { key: 'order_id', header: '#' },
                { key: 'total_amount', header: t('common.total'), render: (r) => `${r.total_amount} ${t('common.birr')}` },
                { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> }
              ]}
              rows={myOrders}
            />
          </Card>
        )}
      </div>

      {loading && <p className="text-sm text-bark/50">{t('common.loading')}</p>}
    </div>
  )
}
