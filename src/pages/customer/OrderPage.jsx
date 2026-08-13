import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Plus, Minus, CheckCircle2, Wallet } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Select from '../../components/common/Select'
import StatCard from '../../components/common/StatCard'

// Customer-facing "order for myself, pay from my wallet" page. Backed by the
// place_self_order(items, order_type) SECURITY DEFINER function from
// step10_customer_self_order.sql — pricing is always resolved server-side
// (staff_price vs guest_price) so nothing here is trusted client input except
// which items and quantities were picked.
export default function OrderPage() {
  const { t, i18n } = useTranslation()
  const { profile, role } = useAuth()
  const isAm = i18n.language?.startsWith('am')

  const [menu, setMenu] = useState([])
  const [wallet, setWallet] = useState(null)
  const [cart, setCart] = useState({}) // menuItemId -> qty
  const [orderType, setOrderType] = useState('takeaway')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [placedOrderId, setPlacedOrderId] = useState(null)

  const isStaffPrice = role !== 'customer'

  const loadWallet = () => {
    if (!profile?.id) return
    supabase
      .from('wallets')
      .select('balance')
      .eq('profile_id', profile.id)
      .maybeSingle()
      .then(({ data }) => setWallet(data))
  }

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => setMenu(data || []))
    loadWallet()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

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
  const balance = wallet?.balance || 0
  const insufficientFunds = subtotal > balance

  const addToCart = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const decFromCart = (id) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }))

  const placeOrder = async () => {
    if (lines.length === 0 || insufficientFunds) return
    setBusy(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('place_self_order', {
      items: lines.map((l) => ({ menu_item_id: l.item.id, quantity: l.qty })),
      order_type: orderType
    })
    setBusy(false)
    if (rpcError) {
      setError(
        rpcError.message?.includes('insufficient_balance')
          ? t('customer.insufficientBalance')
          : rpcError.message
      )
      return
    }
    setPlacedOrderId(data)
    setCart({})
    loadWallet()
  }

  if (placedOrderId) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <CheckCircle2 className="mx-auto text-forest" size={48} />
        <h1 className="font-display text-2xl text-ink">{t('customer.orderSuccess', { id: placedOrderId })}</h1>
        <p className="text-sm text-bark/60">{t('customer.orderSuccessHint')}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" onClick={() => setPlacedOrderId(null)}>
            {t('pos.newOrder')}
          </Button>
          <Link to="/account/orders">
            <Button>{t('customer.orderHistory')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="font-display text-2xl text-ink">{t('customer.orderNow')}</h1>
          <StatCard icon={Wallet} label={t('customer.balance')} value={`${balance.toLocaleString()} ${t('common.birr')}`} />
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
          {menu.length === 0 && <p className="text-sm text-bark/50 col-span-full py-6 text-center">{t('common.noResults')}</p>}
        </div>
      </div>

      <div>
        <Card title={t('pos.cart')} className="sticky top-20">
          <div className="mb-4">
            <Select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
              <option value="takeaway">{t('pos.takeaway')}</option>
              <option value="dine_in">{t('pos.dineIn')}</option>
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

          {insufficientFunds && lines.length > 0 && (
            <p className="text-sm text-clay mb-3">{t('customer.insufficientBalance')}</p>
          )}
          {error && !insufficientFunds && <p className="text-sm text-clay mb-3">{error}</p>}

          <Button className="w-full" size="lg" disabled={lines.length === 0 || insufficientFunds || busy} onClick={placeOrder}>
            {t('customer.placeOrder')}
          </Button>

          {insufficientFunds && lines.length > 0 && (
            <Link to="/account/wallet" className="block text-center text-sm text-forest underline mt-3">
              {t('customer.requestTopUp')}
            </Link>
          )}
        </Card>
      </div>
    </div>
  )
}
