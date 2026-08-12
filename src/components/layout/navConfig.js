import {
  LayoutDashboard, Boxes, Truck, AlertTriangle, ClipboardList,
  ChefHat, Utensils, ClipboardCheck, Trash2, ShoppingCart,
  Receipt, Wallet, ScrollText, BarChart3, Tv
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
    roles: ['super_admin', 'kitchen_staff', 'auditor'],
    children: [
      { labelKey: 'nav.kitchenDisplay', path: '/kitchen/display', icon: Tv },
      { labelKey: 'nav.menuRecipes', path: '/kitchen/menu', icon: Utensils },
      { labelKey: 'nav.requisitions', path: '/kitchen/requisitions', icon: ClipboardCheck },
      { labelKey: 'nav.production', path: '/kitchen/production', icon: ChefHat },
      { labelKey: 'nav.waste', path: '/kitchen/waste', icon: Trash2 }
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
    key: 'account',
    labelKey: 'nav.myAccount',
    icon: Receipt,
    roles: ['customer', 'kitchen_staff', 'cashier', 'warehouse_keeper', 'super_admin', 'auditor'],
    children: [
      { labelKey: 'nav.orderHistory', path: '/account/orders', icon: Receipt },
      { labelKey: 'nav.wallet', path: '/account/wallet', icon: Wallet }
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
