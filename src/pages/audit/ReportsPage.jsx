import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabaseClient'
import Card from '../../components/common/Card'
import DataTable from '../../components/common/DataTable'

export default function ReportsPage() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language?.startsWith('am')

  const [stock, setStock] = useState([])
  const [cash, setCash] = useState([])
  const [dish, setDish] = useState([])
  const [closing, setClosing] = useState([])

  useEffect(() => {
    supabase.from('stock_reconciliation_report').select('*').then(({ data }) => setStock(data || []))
    supabase.from('cash_reconciliation_report').select('*').then(({ data }) => setCash(data || []))
    supabase.from('dish_reconciliation_report').select('*').then(({ data }) => setDish(data || []))
    supabase.from('daily_closing_report').select('*').order('sales_date', { ascending: false }).limit(14).then(({ data }) => setClosing(data || []))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-ink">{t('audit.reports')}</h1>

      <Card title={t('audit.dishReconciliation')} subtitle="produced − sold − wasted, per dish">
        <DataTable
          columns={[
            { key: 'name', header: t('common.name'), render: (r) => (isAm ? r.name_am || r.name_en : r.name_en) },
            { key: 'total_produced', header: t('audit.produced') },
            { key: 'total_sold', header: t('audit.sold') },
            { key: 'total_wasted', header: t('audit.wasted') },
            {
              key: 'unaccounted_quantity',
              header: t('audit.unaccounted'),
              render: (r) => (
                <span className={Math.abs(r.unaccounted_quantity) > 0 ? 'text-clay font-semibold' : ''}>
                  {r.unaccounted_quantity}
                </span>
              )
            }
          ]}
          rows={dish}
        />
      </Card>

      <Card title={t('audit.stockReconciliation')}>
        <DataTable
          columns={[
            { key: 'name', header: t('common.name'), render: (r) => (isAm ? r.name_am || r.name_en : r.name_en) },
            { key: 'counted_quantity', header: t('warehouse.countedQuantity') },
            { key: 'system_quantity_at_count', header: t('warehouse.systemQuantity') },
            { key: 'variance', header: t('warehouse.variance') },
            { key: 'flagged', header: t('audit.flagged'), render: (r) => (r.flagged ? '⚠️' : '—') }
          ]}
          rows={stock}
        />
      </Card>

      <Card title={t('audit.cashReconciliation')}>
        <DataTable
          columns={[
            { key: 'cashier_name', header: t('audit.user') },
            { key: 'business_date', header: t('common.date'), render: (r) => new Date(r.business_date).toLocaleDateString() },
            { key: 'expected_cash', header: 'Expected' },
            { key: 'counted_cash', header: 'Counted' },
            { key: 'variance', header: t('warehouse.variance') },
            { key: 'flagged', header: t('audit.flagged'), render: (r) => (r.flagged ? '⚠️' : '—') }
          ]}
          rows={cash}
        />
      </Card>

      <Card title={t('audit.dailyClosing')}>
        <DataTable
          columns={[
            { key: 'sales_date', header: t('common.date'), render: (r) => new Date(r.sales_date).toLocaleDateString() },
            { key: 'total_orders', header: '#' },
            { key: 'total_revenue', header: t('common.total') },
            { key: 'cash_collected', header: t('pos.cash') },
            { key: 'digital_collected', header: 'Digital' },
            { key: 'items_wasted_count', header: t('audit.wasted') }
          ]}
          rows={closing}
        />
      </Card>
    </div>
  )
}
