import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, ArrowRight, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

// Order status moves one step at a time: placed -> preparing -> ready -> completed.
// 'completed' is what actually fires the made-to-order stock deduction (Step 4
// trigger), so this page is also what "serves" an order, not just a display.
//
// Cashiers can SEE this board (so they know whether an order is ready to hand
// over) but can't advance it — only kitchen_staff (and auditor/super_admin)
// actually mark food as prepared/ready/completed. This keeps "took the
// payment" and "confirmed the food was made" as two different people.
const NEXT_STATUS = { placed: 'preparing', preparing: 'ready', ready: 'completed' }
const COLUMNS = ['placed', 'preparing', 'ready']

export default function KitchenDisplayPage() {
  const { t, i18n } = useTranslation()
  const { role } = useAuth()
  const isAm = i18n.language?.startsWith('am')
  const canAdvance = role !== 'cashier'

  const [orders, setOrders] = useState([])
  const [connected, setConnected] = useState(false)
  const [advancing, setAdvancing] = useState(null)

  const loadActiveOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(quantity, menu_items(name_en, name_am))')
      .in('status', COLUMNS)
      .order('created_at', { ascending: true })
    setOrders(data || [])
  }, [])

  useEffect(() => {
    loadActiveOrders()

    // Live updates: any insert/update/delete on orders refreshes the board.
    // Refetching (rather than patching state from the payload) keeps this
    // simple and correct even if order_items arrive in a separate event.
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadActiveOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadActiveOrders())
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))

    // Fallback for when the realtime socket drops without the tab noticing —
    // a slow poll costs little and guarantees the board can't get stuck stale.
    const poll = setInterval(loadActiveOrders, 20000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [loadActiveOrders])

  const advance = async (order) => {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setAdvancing(order.id)
    const patch = { status: next }
    if (next === 'completed') patch.completed_at = new Date().toISOString()
    await supabase.from('orders').update(patch).eq('id', order.id)
    setAdvancing(null)
  }

  const byColumn = useMemo(() => {
    const grouped = { placed: [], preparing: [], ready: [] }
    for (const o of orders) {
      if (grouped[o.status]) grouped[o.status].push(o)
    }
    return grouped
  }, [orders])

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="font-display text-2xl text-ink">{t('kitchen.display')}</h1>
        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-forestLight/20 text-forest' : 'bg-stone text-bark/50'}`}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connected ? t('kitchen.live') : t('kitchen.reconnecting')}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {COLUMNS.map((status) => (
          <div key={status}>
            <h2 className="font-display text-base text-ink mb-2 flex items-center justify-between">
              {t(`status.${status}`)}
              <span className="text-xs font-body font-normal text-bark/50">{byColumn[status].length}</span>
            </h2>
            <div className="space-y-3">
              {byColumn[status].length === 0 && (
                <p className="text-xs text-bark/40 py-6 text-center border border-dashed border-bark/15 rounded-card">
                  {t('kitchen.columnEmpty')}
                </p>
              )}
              {byColumn[status].map((order) => (
                <OrderTicket
                  key={order.id}
                  order={order}
                  isAm={isAm}
                  t={t}
                  busy={advancing === order.id}
                  onAdvance={() => advance(order)}
                  canAdvance={canAdvance}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function elapsedMinutes(createdAt) {
  return Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000))
}

function OrderTicket({ order, isAm, t, busy, onAdvance, canAdvance }) {
  const next = NEXT_STATUS[order.status]
  const mins = elapsedMinutes(order.created_at)
  return (
    <Card className={mins >= 15 ? 'border-clay/40' : ''}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-display text-lg text-ink">#{order.id}</p>
          <p className="text-xs text-bark/50 capitalize">{t(`pos.${order.order_type}`)}</p>
        </div>
        <span className={`flex items-center gap-1 text-xs ${mins >= 15 ? 'text-clay' : 'text-bark/50'}`}>
          <Clock size={12} /> {t('kitchen.minutesAgo', { count: mins })}
        </span>
      </div>

      <ul className="text-sm space-y-1 mb-3">
        {(order.order_items || []).map((oi, idx) => (
          <li key={idx}>
            {oi.quantity}× {isAm ? oi.menu_items?.name_am || oi.menu_items?.name_en : oi.menu_items?.name_en}
          </li>
        ))}
      </ul>

      {next && canAdvance && (
        <Button size="sm" className="w-full" disabled={busy} onClick={onAdvance}>
          {busy ? t('common.loading') : t(`kitchen.advanceTo.${next}`)}
          {!busy && <ArrowRight size={14} />}
        </Button>
      )}
      {next && !canAdvance && (
        <p className="text-xs text-bark/40 text-center py-1.5">{t('kitchen.viewOnly')}</p>
      )}
    </Card>
  )
}
