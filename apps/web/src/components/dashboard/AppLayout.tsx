import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (! isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-[#F8F7F4]">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-[#1B2E4B] md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg text-white/80 hover:bg-white/10"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <p className="text-white font-semibold text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
          Koetz<span className="text-[#C9A84C]">Sing</span>
        </p>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  )
}
