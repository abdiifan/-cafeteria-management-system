import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-parchment">
      <Sidebar open={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      {mobileOpen && (
        <div className="fixed inset-0 bg-ink/40 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
