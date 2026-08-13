import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'

import ItemsPage from './pages/warehouse/ItemsPage'
import StockInPage from './pages/warehouse/StockInPage'
import SuppliersPage from './pages/warehouse/SuppliersPage'
import LowStockPage from './pages/warehouse/LowStockPage'
import StockCountPage from './pages/warehouse/StockCountPage'

import MenuRecipesPage from './pages/kitchen/MenuRecipesPage'
import RequisitionsPage from './pages/kitchen/RequisitionsPage'
import ProductionPage from './pages/kitchen/ProductionPage'
import WastePage from './pages/kitchen/WastePage'
import KitchenDisplayPage from './pages/kitchen/KitchenDisplayPage'

import POSPage from './pages/pos/POSPage'
import WalletTopUpsPage from './pages/pos/WalletTopUpsPage'

import OrderHistoryPage from './pages/customer/OrderHistoryPage'
import WalletPage from './pages/customer/WalletPage'

import AuditLogPage from './pages/audit/AuditLogPage'
import ReportsPage from './pages/audit/ReportsPage'

import SettingsPage from './pages/account/SettingsPage'

import UsersPage from './pages/admin/UsersPage'
import TaxSettingsPage from './pages/admin/TaxSettingsPage'
import NotificationsPage from './pages/admin/NotificationsPage'

const WAREHOUSE_ROLES = ['warehouse_keeper', 'auditor']
const KITCHEN_ROLES = ['kitchen_staff', 'auditor']
const POS_ROLES = ['cashier']
const WALLET_APPROVAL_ROLES = ['cashier', 'super_admin']
const AUDIT_ROLES = ['auditor']
const ADMIN_ROLES = ['super_admin']

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />

            <Route path="/warehouse/items" element={<ProtectedRoute roles={WAREHOUSE_ROLES}><ItemsPage /></ProtectedRoute>} />
            <Route path="/warehouse/stock-in" element={<ProtectedRoute roles={WAREHOUSE_ROLES}><StockInPage /></ProtectedRoute>} />
            <Route path="/warehouse/suppliers" element={<ProtectedRoute roles={WAREHOUSE_ROLES}><SuppliersPage /></ProtectedRoute>} />
            <Route path="/warehouse/low-stock" element={<ProtectedRoute roles={WAREHOUSE_ROLES}><LowStockPage /></ProtectedRoute>} />
            <Route path="/warehouse/stock-count" element={<ProtectedRoute roles={WAREHOUSE_ROLES}><StockCountPage /></ProtectedRoute>} />

            <Route path="/kitchen/display" element={<ProtectedRoute roles={[...KITCHEN_ROLES, 'cashier']}><KitchenDisplayPage /></ProtectedRoute>} />
            <Route path="/kitchen/menu" element={<ProtectedRoute roles={KITCHEN_ROLES}><MenuRecipesPage /></ProtectedRoute>} />
            <Route path="/kitchen/requisitions" element={<ProtectedRoute roles={[...KITCHEN_ROLES, 'warehouse_keeper']}><RequisitionsPage /></ProtectedRoute>} />
            <Route path="/kitchen/production" element={<ProtectedRoute roles={KITCHEN_ROLES}><ProductionPage /></ProtectedRoute>} />
            <Route path="/kitchen/waste" element={<ProtectedRoute roles={[...KITCHEN_ROLES, 'warehouse_keeper']}><WastePage /></ProtectedRoute>} />

            <Route path="/pos" element={<ProtectedRoute roles={POS_ROLES}><POSPage /></ProtectedRoute>} />
            <Route path="/pos/wallet-topups" element={<ProtectedRoute roles={WALLET_APPROVAL_ROLES}><WalletTopUpsPage /></ProtectedRoute>} />

            <Route path="/account/orders" element={<OrderHistoryPage />} />
            <Route path="/account/wallet" element={<WalletPage />} />
            <Route path="/account/settings" element={<SettingsPage />} />

            <Route path="/audit/log" element={<ProtectedRoute roles={AUDIT_ROLES}><AuditLogPage /></ProtectedRoute>} />
            <Route path="/audit/reports" element={<ProtectedRoute roles={AUDIT_ROLES}><ReportsPage /></ProtectedRoute>} />

            <Route path="/admin/users" element={<ProtectedRoute roles={ADMIN_ROLES}><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/tax" element={<ProtectedRoute roles={ADMIN_ROLES}><TaxSettingsPage /></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute roles={ADMIN_ROLES}><NotificationsPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
