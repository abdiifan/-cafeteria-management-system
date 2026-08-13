import {
  LayoutDashboard, Boxes, Truck, AlertTriangle, ClipboardList,
  ChefHat, Utensils, ClipboardCheck, Trash2, ShoppingCart,
  Receipt, Wallet, ScrollText, BarChart3, Tv, Settings,
  ShieldCheck, UserCog, Percent, Bell, UtensilsCrossed
} from 'lucide-react'

// Each entry declares which roles can see it. super_admin can always see everything (handled in Sidebar).
export const NAV_SECTIONS = [
  {
    key: 'dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    path: '/',
    roles: ['super_admin', 'warehouse_keeper', 'kitchen_staff', 'cashier', 'auditor', 'customer']
  },
  {
    key: 'warehouse',
    labelKey: 'nav.warehouse',
    icon: Boxes,
    roles: ['super_admin', 'warehouse_keeper', 'auditor'],
    children: [
      { labelKey: 'nav.items', path: '/warehouse/items', icon: Boxes },
      { labelKey: 'nav.stockIn', path: '/warehouse/stock-in', icon: Truck },
      { labelKey: 'nav.suppliers', path: '/warehouse/suppliers', icon: Truck },
      { labelKey: 'nav.lowStock', path: '/warehouse/low-stock', icon: AlertTriangle },
      { labelKey: 'nav.stockCount', path: '/warehouse/stock-count', icon: ClipboardList }
    ]
  },
  {
    key: 'kitchen',
    labelKey: 'nav.kitchen',
    icon: ChefHat,
    // warehouse_keeper is included because Requisitions and Waste are shared
    // warehouse<->kitchen workflows (see App.jsx route roles) — without this,
    // a warehouse keeper has no way to reach the requests kitchen sends them.
    roles: ['super_admin', 'kitchen_staff', 'auditor', 'warehouse_keeper'],
    // Child-level roles mirror the route roles in App.jsx exactly. Omitting
    // `roles` on a child means "inherit the section's roles" (see Sidebar.jsx).
    children: [
      { labelKey: 'nav.kitchenDisplay', path: '/kitchen/display', icon: Tv, roles: ['super_admin', 'kitchen_staff', 'auditor'] },
      { labelKey: 'nav.menuRecipes', path: '/kitchen/menu', icon: Utensils, roles: ['super_admin', 'kitchen_staff', 'auditor'] },
      { labelKey: 'nav.requisitions', path: '/kitchen/requisitions', icon: ClipboardCheck, roles: ['super_admin', 'kitchen_staff', 'auditor', 'warehouse_keeper'] },
      { labelKey: 'nav.production', path: '/kitchen/production', icon: ChefHat, roles: ['super_admin', 'kitchen_staff', 'auditor'] },
      { labelKey: 'nav.waste', path: '/kitchen/waste', icon: Trash2, roles: ['super_admin', 'kitchen_staff', 'auditor', 'warehouse_keeper'] }
    ]
  },
  {
    key: 'pos',
    labelKey: 'nav.pos',
    icon: ShoppingCart,
    path: '/pos',
    roles: ['super_admin', 'cashier']
  },
  {
    key: 'kitchenDisplayStandalone',
    labelKey: 'nav.kitchenDisplay',
    icon: Tv,
    path: '/kitchen/display',
    roles: ['cashier']
  },
  {
    key: 'walletTopups',
    labelKey: 'nav.walletTopups',
    icon: Wallet,
    path: '/pos/wallet-topups',
    roles: ['super_admin', 'cashier']
  },
  {
    key: 'account',
    labelKey: 'nav.myAccount',
    icon: Receipt,
    roles: ['customer', 'kitchen_staff', 'cashier', 'warehouse_keeper', 'super_admin', 'auditor'],
    children: [
      { labelKey: 'nav.orderNow', path: '/account/order', icon: UtensilsCrossed },
      { labelKey: 'nav.orderHistory', path: '/account/orders', icon: Receipt },
      { labelKey: 'nav.wallet', path: '/account/wallet', icon: Wallet },
      { labelKey: 'nav.settings', path: '/account/settings', icon: Settings }
    ]
  },
  {
    key: 'admin',
    labelKey: 'nav.admin',
    icon: ShieldCheck,
    roles: ['super_admin'],
    children: [
      { labelKey: 'nav.usersRoles', path: '/admin/users', icon: UserCog },
      { labelKey: 'nav.taxVat', path: '/admin/tax', icon: Percent },
      { labelKey: 'nav.notifications', path: '/admin/notifications', icon: Bell }
    ]
  },
  {
    key: 'audit',
    labelKey: 'nav.audit',
    icon: ScrollText,
    roles: ['super_admin', 'auditor'],
    children: [
      { labelKey: 'nav.auditLog', path: '/audit/log', icon: ScrollText },
      { labelKey: 'nav.reports', path: '/audit/reports', icon: BarChart3 }
    ]
  }
]
