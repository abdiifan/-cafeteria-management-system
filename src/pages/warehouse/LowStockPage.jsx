import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabaseClient'
import Card from '../../components/common/Card'
import DataTable from '../../components/common/DataTable'

export default function LowStockPage() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language?.startsWith('am')
  const [lowStock, setLowStock] = useState([])
  const [expiring, setExpiring] = useState([])

  useEffect(() => {
    supabase.from('low_stock_items').select('*').then(({ data }) => setLowStock(data || []))
    supabase.from('expiring_soon_batches').select('*').then(({ data }) => setExpiring(data || []))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-ink">{t('nav.lowStock')}</h1>

      <Card title={t('warehouse.lowStockTitle')}>
        <DataTable
          emptyMessage={t('warehouse.lowStockEmpty')}
          columns={[
            { key: 'name', header: t('common.name'), render: (r) => (isAm ? r.name_am || r.name_en : r.name_en) },
            { key: 'current_stock', header: t('warehouse.currentStock'), render: (r) => `${r.current_stock} ${r.unit}` },
            { key: 'reorder_threshold', header: t('warehouse.reorderThreshold') }
          ]}
          rows={lowStock}
        />
      </Card>

      <Card title={t('dashboard.expiringSoon')}>
        <DataTable
          columns={[
            { key: 'name', header: t('common.name'), render: (r) => (isAm ? r.name_am || r.name_en : r.name_en) },
            { key: 'quantity_remaining', header: t('common.quantity') },
            { key: 'expiry_date', header: t('warehouse.expiryDate'), render: (r) => new Date(r.expiry_date).toLocaleDateString() }
          ]}
          rows={expiring}
        />
      </Card>
    </div>
  )
}
