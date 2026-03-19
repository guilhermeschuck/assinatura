import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, ShieldCheck, LogOut, UserCog, History, Settings, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'

const navItems = [
  { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard',      adminOnly: false },
  { to: '/documents',            icon: FileText,        label: 'Documentos',     adminOnly: false },
  { to: '/clients',              icon: Users,           label: 'Clientes',       adminOnly: false },
  { to: '/team',                 icon: UserCog,         label: 'Equipe',         adminOnly: false },
  { to: '/activity',             icon: History,         label: 'Atividades',     adminOnly: true  },
  { to: '/settings',             icon: Settings,        label: 'Configurações',  adminOnly: true  },
  { to: '/settings/certificate', icon: ShieldCheck,     label: 'Certificado A1', adminOnly: true  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const logout   = useAuthStore(s => s.logout)
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const isAdmin  = user?.role === 'admin'

  const handleLogout = async () => {
    try { await authService.logout() } catch { /* ignora */ }
    logout()
    navigate('/login')
  }

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-50 w-64 bg-[#1B2E4B] flex flex-col transition-transform duration-200 ease-in-out',
        'md:static md:translate-x-0 md:min-h-screen',
        open ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#C9A84C] rounded-md flex items-center justify-center">
            <FileText size={16} className="text-[#1B2E4B]" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Koetz<span className="text-[#C9A84C]">Sing</span>
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-white/60 hover:bg-white/10 md:hidden" aria-label="Fechar menu">
          <X size={18} />
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            onClick={onClose}
            className={({ isActive }) => [
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuário + Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-1">
          <p className="text-white text-sm font-medium truncate">{user?.name}</p>
          <p className="text-white/50 text-xs truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
