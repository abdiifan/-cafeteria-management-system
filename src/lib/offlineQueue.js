// ============================================================
// Offline outbox for the POS
// ============================================================
// When the POS can't reach Supabase (airplane-mode-style internet
// drops are normal, not exceptional, per the requirements doc),
// a completed sale is written here instead of being lost. Anything
// in the queue is retried automatically the moment the browser
// reports it's back online, and can also be retried by hand.
//
// Deliberately plain localStorage, not IndexedDB: the payloads are
// small (a handful of orders at most between reconnects) and this
// keeps the implementation easy to reason about and debug by just
// opening devtools -> Application -> Local Storage.
// ============================================================

const STORAGE_KEY = 'cms_pos_offline_queue'
const EVENT_NAME = 'cms:offline-queue-changed'

function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: queue }))
}

// A queued sale carries everything needed to replay the three inserts
// POSPage normally makes directly: the order itself, its line items,
// and the payment. cashier_id/profile info travels with it since the
// cashier who rang it up might not still be the signed-in user by the
// time it syncs (shift change, etc).
export function enqueueOrder(payload) {
  const queue = readQueue()
  const entry = {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
    status: 'pending', // 'pending' | 'syncing' | 'error'
    lastError: null,
    payload
  }
  queue.push(entry)
  writeQueue(queue)
  return entry
}

export function getQueue() {
  return readQueue()
}

export function getQueueCount() {
  return readQueue().filter((e) => e.status !== 'synced').length
}

export function subscribe(callback) {
  const handler = (e) => callback(e.detail)
  window.addEventListener(EVENT_NAME, handler)
  window.addEventListener('storage', () => callback(readQueue()))
  return () => window.removeEventListener(EVENT_NAME, handler)
}

function removeEntry(localId) {
  const queue = readQueue().filter((e) => e.localId !== localId)
  writeQueue(queue)
}

function markEntry(localId, patch) {
  const queue = readQueue().map((e) => (e.localId === localId ? { ...e, ...patch } : e))
  writeQueue(queue)
}

// Replays one queued sale as the same three inserts + status update
// POSPage does when online: order -> order_items -> payment -> completed.
// Returns { ok: true } or { ok: false, error }.
async function syncOne(supabase, entry) {
  const { payload } = entry
  markEntry(entry.localId, { status: 'syncing' })

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_type: payload.orderType,
      cashier_id: payload.cashierId,
      is_staff_price: payload.isStaffPrice,
      subtotal: payload.subtotal,
      total_amount: payload.subtotal
    })
    .select()
    .single()
  if (orderErr) {
    markEntry(entry.localId, { status: 'error', lastError: orderErr.message })
    return { ok: false, error: orderErr }
  }

  const itemRows = payload.lines.map((l) => ({
    order_id: order.id,
    menu_item_id: l.menuItemId,
    quantity: l.qty,
    unit_price: l.unitPrice
  }))
  const { error: itemsErr } = await supabase.from('order_items').insert(itemRows)
  if (itemsErr) {
    markEntry(entry.localId, { status: 'error', lastError: itemsErr.message })
    return { ok: false, error: itemsErr }
  }

  const { error: payErr } = await supabase.from('payments').insert({
    order_id: order.id,
    method: payload.paymentMethod,
    amount: payload.subtotal,
    reference_number: payload.reference || null,
    received_by: payload.cashierId
  })
  if (payErr) {
    markEntry(entry.localId, { status: 'error', lastError: payErr.message })
    return { ok: false, error: payErr }
  }

  removeEntry(entry.localId)
  return { ok: true, order }
}

// Tries every pending/errored entry, oldest first. Stops trying a given
// entry once it fails so one bad row doesn't block the rest of the queue
// from being retried on the next pass — errors stay visible in the queue.
export async function flushQueue(supabase) {
  const queue = readQueue().filter((e) => e.status !== 'syncing')
  const results = []
  for (const entry of queue) {
    // eslint-disable-next-line no-await-in-loop
    const result = await syncOne(supabase, entry)
    results.push({ localId: entry.localId, ...result })
  }
  return results
}
