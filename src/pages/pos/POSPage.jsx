import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Minus, Trash2, Printer, WifiOff, RefreshCw, CloudOff } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { enqueueOrder, getQueueCount, subscribe as subscribeQueue, flushQueue } from '../../lib/offlineQueue'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Select from '../../components/common/Select'
import Input from '../../components/common/Input'
import StatusBadge from '../../components/common/StatusBadge'

const PAYMENT_METHODS = ['cash', 'telebirr', 'cbe_birr', 'hellocash', 'payroll_deduction', 'prepaid_balance']

function isNetworkError(err) {
  if (!err) return false
  const msg = `${err.message || ''}`.toLowerCase()
  return msg.includes('fetch') || msg.includes('network') || msg.includes('failed to') || err instanceof TypeError
}

export default function POSPage() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const isAm = i18n.language?.startsWith('am')

  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState({}) // menuItemId -> qty
  const [orderType, setOrderType] = useState('dine_in')
  const [isStaffPrice, setIsStaffPrice] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [completedOrder, setCompletedOrder] = useState(null)

  const [online, setOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(getQueueCount())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => setMenu(data || []))
  }, [])

  const runFlush = useCallback(async () => {
    if (!navigator.onLine || syncing) return
    setSyncing(true)
    await flushQueue(supabase)
    setSyncing(false)
  }, [syncing])

  useEffect(() => {
    const unsub = subscribeQueue((queue) => setPendingCount(queue.filter((e) => e.status !== 'synced').length))
    const onOnline = () => {
      setOnline(true)
      runFlush()
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    if (navigator.onLine) runFlush()
    return () => {
      unsub()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const priceFor = (item) => (isStaffPrice ? item.staff_price : item.guest_price)

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const item = menu.find((m) => String(m.id) === id)
          return item ? { item, qty, lineTotal: priceFor(item) * qty } : null
        })
        .filter(Boolean),
    [cart, menu, isStaffPrice]
  )

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)

  const addToCart = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const decFromCart = (id) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }))
  const removeFromCart = (id) => setCart((c) => ({ ...c, [id]: 0 }))

  // Writes the sale straight to Supabase. Order is left as 'placed' — the
  // kitchen display (and cashier, for made-to-order without a kitchen
  // queue) is what advances it through preparing -> ready -> completed,
  // which is also what triggers the made-to-order stock deduction.
  const submitOnline = async () => {
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_type: orderType,
        cashier_id: profile.id,
        is_staff_price: isStaffPrice,
        subtotal,
        total_amount: subtotal
      })
      .select()
      .single()
    if (orderErr) throw orderErr

    const itemRows = lines.map((l) => ({
      order_id: order.id,
      menu_item_id: l.item.id,
      quantity: l.qty,
      unit_price: priceFor(l.item)
    }))
    const { error: itemsErr } = await supabase.from('order_items').insert(itemRows)
    if (itemsErr) throw itemsErr

    const { error: payErr } = await supabase.from('payments').insert({
      order_id: order.id,
      method: paymentMethod,
      amount: subtotal,
      reference_number: reference || null,
      received_by: profile.id
    })
    if (payErr) throw payErr

    return order
  }

  const queueOffline = () => {
    const entry = enqueueOrder({
      orderType,
      cashierId: profile.id,
      isStaffPrice,
      subtotal,
      paymentMethod,
      reference,
      lines: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty, unitPrice: priceFor(l.item) }))
    })
    setCompletedOrder({
      id: entry.localId,
      lines,
      subtotal,
      paymentMethod,
      orderType,
      isStaffPrice,
      status: 'placed',
      synced: false
    })
    setCart({})
    setReference('')
  }

  const completeOrder = async () => {
    if (lines.length === 0) return
    setError('')

    if (!navigator.onLine) {
      queueOffline()
      return
    }

    setBusy(true)
    try {
      const order = await submitOnline()
      setCompletedOrder({
        id: order.id,
        lines,
        subtotal,
        paymentMethod,
        orderType,
        isStaffPrice,
        status: 'placed',
        synced: true
      })
      setCart({})
      setReference('')
    } catch (err) {
      if (isNetworkError(err)) {
        setOnline(false)
        queueOffline()
      } else {
        setError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  if (completedOrder) {
    return (
      <Receipt
        order={completedOrder}
        cashierName={(isAm && profile?.full_name_am) || profile?.full_name}
        onNewOrder={() => setCompletedOrder(null)}
        t={t}
        isAm={isAm}
      />
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="font-display text-2xl text-ink">{t('pos.menu')}</h1>
          <ConnectionStatus online={online} pendingCount={pendingCount} syncing={syncing} onSync={runFlush} t={t} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {menu.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item.id)}
              className="text-left bg-white/70 border border-bark/10 rounded-card p-4 hover:border-forest hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="font-medium text-ink">{isAm ? item.name_am || item.name_en : item.name_en}</div>
              <div className="text-xs text-bark/50 mt-0.5 capitalize">{item.category}</div>
              <div className="mt-2 font-display text-lg text-forest">
                {priceFor(item)} {t('common.birr')}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Card title={t('pos.cart')} className="sticky top-20">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
              <option value="dine_in">{t('pos.dineIn')}</option>
              <option value="takeaway">{t('pos.takeaway')}</option>
            </Select>
            <Select value={isStaffPrice ? 'staff' : 'guest'} onChange={(e) => setIsStaffPrice(e.target.value === 'staff')}>
              <option value="guest">{t('pos.guest')}</option>
              <option value="staff">{t('pos.staff')}</option>
            </Select>
          </div>

          {lines.length === 0 ? (
            <p className="text-sm text-bark/50 py-6 text-center">{t('pos.emptyCart')}</p>
          ) : (
            <div className="space-y-2 mb-4">
              {lines.map((l) => (
                <div key={l.item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex-1">{isAm ? l.item.name_am || l.item.name_en : l.item.name_en}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => decFromCart(l.item.id)} className="p-1 rounded hover:bg-stone">
                      <Minus size={14} />
                    </button>
                    <span className="w-5 text-center">{l.qty}</span>
                    <button onClick={() => addToCart(l.item.id)} className="p-1 rounded hover:bg-stone">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => removeFromCart(l.item.id)} className="p-1 rounded hover:bg-clay/10 text-clay">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <span className="w-16 text-right">{l.lineTotal}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 border-t border-bark/10">
                <span>{t('pos.subtotal')}</span>
                <span>{subtotal} {t('common.birr')}</span>
              </div>
            </div>
          )}

          <div className="space-y-2 mb-4">
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`pos.${m}`)}
                </option>
              ))}
            </Select>
            {paymentMethod !== 'cash' && paymentMethod !== 'prepaid_balance' && paymentMethod !== 'payroll_deduction' && (
              <Input
                placeholder={t('pos.referenceNumber')}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            )}
          </div>

          {!online && (
            <p className="text-xs text-clay mb-3 flex items-center gap-1.5">
              <WifiOff size={14} /> {t('pos.offlineNotice')}
            </p>
          )}
          {error && <p className="text-sm text-clay mb-3">{error}</p>}

          <Button className="w-full" size="lg" disabled={lines.length === 0 || busy} onClick={completeOrder}>
            {online ? t('pos.completeOrder') : t('pos.completeOrderOffline')}
          </Button>
        </Card>
      </div>
    </div>
  )
}

function ConnectionStatus({ online, pendingCount, syncing, onSync, t }) {
  if (online && pendingCount === 0) return null
  return (
    <div
      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${
        online ? 'bg-goldSoft text-bark' : 'bg-clay/15 text-clay'
      }`}
    >
      {online ? <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> : <WifiOff size={13} />}
      <span>
        {online
          ? t('pos.pendingSync', { count: pendingCount })
          : t('pos.offlineWithQueue', { count: pendingCount })}
      </span>
      {online && pendingCount > 0 && (
        <button onClick={onSync} disabled={syncing} className="underline font-medium disabled:opacity-50">
          {t('pos.syncNow')}
        </button>
      )}
    </div>
  )
}

function Receipt({ order, cashierName, onNewOrder, t, isAm }) {
  const [width, setWidth] = useState('80mm')
  const now = useMemo(() => new Date(), [])

  const handlePrint = () => {
    document.documentElement.setAttribute('data-receipt-width', width)
    window.print()
  }

  return (
    <div className="max-w-sm mx-auto">
      {!order.synced && (
        <div className="mb-3 flex items-center gap-2 text-sm bg-clay/10 text-clay px-3 py-2 rounded-card">
          <CloudOff size={16} />
          <span>{t('pos.receiptPendingSync')}</span>
        </div>
      )}

      <div className="mb-3 flex items-center justify-end gap-2 text-xs text-bark/60">
        <span>{t('pos.receiptWidth')}</span>
        <div className="flex rounded-full border border-bark/20 overflow-hidden">
          {['58mm', '80mm'].map((w) => (
            <button
              key={w}
              onClick={() => setWidth(w)}
              className={`px-2.5 py-1 ${width === w ? 'bg-forest text-parchment' : 'bg-white text-bark'}`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div id="receipt-print-area">
          <div className="text-center mb-3">
            <p className="font-display text-lg">{t('app.name')}</p>
            <p className="text-xs text-bark/60 mt-0.5">
              {now.toLocaleDateString()} {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-bark/60">{cashierName}</p>
          </div>

          <div className="flex items-center justify-between text-sm mb-3">
            <p className="text-forest font-medium">{t('pos.orderPlaced', { id: order.id })}</p>
            <StatusBadge status={order.status} />
          </div>

          <p className="text-xs text-bark/60 mb-2 capitalize">
            {t(`pos.${order.orderType}`)} · {t(`pos.${order.isStaffPrice ? 'staff' : 'guest'}`)}
          </p>

          <div className="space-y-1 text-sm mb-3 border-t border-dashed border-bark/20 pt-2">
            {order.lines.map((l) => (
              <div key={l.item.id} className="flex justify-between">
                <span>
                  {l.qty}× {isAm ? l.item.name_am || l.item.name_en : l.item.name_en}
                </span>
                <span>{l.lineTotal}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-semibold border-t border-dashed border-bark/20 pt-2 mb-3">
            <span>{t('pos.subtotal')}</span>
            <span>{order.subtotal} {t('common.birr')}</span>
          </div>
          <p className="text-xs text-bark/50">
            {t('pos.paymentMethod')}: {t(`pos.${order.paymentMethod}`)}
          </p>
          {!order.synced && <p className="text-xs text-clay mt-2">{t('pos.receiptPendingSync')}</p>}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer size={16} /> {t('pos.printReceipt')}
          </Button>
          <Button className="flex-1" onClick={onNewOrder}>
            {t('pos.newOrder')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
