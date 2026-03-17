import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  FilePlus, FileX, RefreshCw, PenLine, CheckCircle2,
  UserPlus, UserMinus, Search, Filter, Clock, Bot, Loader2,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { activityService, type ActivityLogEntry } from '@/services/activity.service'
import type { PaginatedResponse } from '@/types'
import { Alert } from '@/components/ui/Alert'

// ─── Action config ────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  document_created:  { icon: FilePlus,      label: 'Documento criado',   color: 'text-[#1B2E4B]',  bg: 'bg-[#1B2E4B]/10' },
  document_cancelled:{ icon: FileX,         label: 'Cancelado',          color: 'text-red-600',     bg: 'bg-red-50' },
  link_resent:       { icon: RefreshCw,      label: 'Link reenviado',     color: 'text-amber-600',   bg: 'bg-amber-50' },
  client_signed:     { icon: PenLine,        label: 'Cliente assinou',    color: 'text-blue-600',    bg: 'bg-blue-50' },
  document_completed:{ icon: CheckCircle2,   label: 'Concluído',          color: 'text-[#0F7A5A]',   bg: 'bg-emerald-50' },
  user_invited:      { icon: UserPlus,       label: 'Membro adicionado',  color: 'text-violet-600',  bg: 'bg-violet-50' },
  user_removed:      { icon: UserMinus,      label: 'Membro removido',    color: 'text-rose-600',    bg: 'bg-rose-50' },
}

const ALL_ACTIONS = Object.entries(ACTION_CONFIG).map(([value, { label }]) => ({ value, label }))

// ─── Avatar ───────────────────────────────────────────────────────────────────
function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div className="w-7 h-7 rounded-lg bg-[#1B2E4B] text-[#C9A84C] flex items-center justify-center text-[10px] font-bold shrink-0 select-none">
      {initials}
    </div>
  )
}

// ─── Timeline Entry ───────────────────────────────────────────────────────────
function TimelineEntry({ entry, index }: { entry: ActivityLogEntry; index: number }) {
  const cfg = ACTION_CONFIG[entry.action] ?? {
    icon: Clock, label: entry.action, color: 'text-[#6B7280]', bg: 'bg-[#F0EDE8]',
  }
  const Icon = cfg.icon
  const fmtDate = (d: string) => {
    const date = new Date(d)
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
  }
  const { date, time } = fmtDate(entry.created_at)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex gap-4 group"
    >
      {/* Timeline line */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
          <Icon size={16} className={cfg.color} />
        </div>
        <div className="w-px flex-1 bg-[#E2DDD5] mt-1 group-last:hidden" />
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Badge */}
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider ${cfg.color} mb-1`}>
              {cfg.label}
            </span>
            {/* Description */}
            <p className="text-sm text-[#1B2E4B] leading-relaxed">{entry.description}</p>
          </div>
          {/* Timestamp */}
          <div className="text-right shrink-0">
            <p className="text-xs font-medium text-[#374151]">{time}</p>
            <p className="text-xs text-[#9CA3AF]">{date}</p>
          </div>
        </div>

        {/* Actor */}
        <div className="flex items-center gap-2 mt-2">
          {entry.user ? (
            <>
              <UserAvatar name={entry.user.name} />
              <span className="text-xs text-[#6B7280]">{entry.user.name}</span>
            </>
          ) : (
            <>
              <div className="w-7 h-7 rounded-lg bg-[#F0EDE8] flex items-center justify-center shrink-0">
                <Bot size={13} className="text-[#6B7280]" />
              </div>
              <span className="text-xs text-[#9CA3AF] italic">Ação do cliente (sem conta)</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ActivityLog() {
  const [data, setData]         = useState<PaginatedResponse<ActivityLogEntry> | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [action, setAction]     = useState('')
  const [page, setPage]         = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await activityService.list({ search: search || undefined, action: action || undefined, page })
      setData(res.data)
    } catch {
      setError('Erro ao carregar o log. Apenas administradores têm acesso.')
    } finally {
      setLoading(false)
    }
  }, [search, action, page])

  useEffect(() => { setPage(1) }, [search, action])
  useEffect(() => { load() }, [load])

  const entries = data?.data ?? []
  const meta    = data?.meta

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B2E4B]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Log de Atividades
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">Registro completo de quem fez o quê e quando</p>
      </div>

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Buscar no histórico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#E2DDD5] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] bg-white"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <select
            value={action}
            onChange={e => setAction(e.target.value)}
            className="pl-9 pr-8 py-2.5 rounded-lg border border-[#E2DDD5] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] bg-white appearance-none min-w-[180px]"
          >
            <option value="">Todas as ações</option>
            {ALL_ACTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#1B2E4B]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F0EDE8] flex items-center justify-center mb-4">
              <Clock size={28} className="text-[#C9A84C]" />
            </div>
            <p className="text-[#1B2E4B] font-semibold mb-1">Nenhuma atividade encontrada</p>
            <p className="text-sm text-[#9CA3AF]">As ações do sistema aparecerão aqui.</p>
          </div>
        ) : (
          <div>
            {entries.map((entry, i) => (
              <TimelineEntry key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[#6B7280]">
            {meta.from}–{meta.to} de {meta.total} registros
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-[#E2DDD5] text-[#6B7280] hover:bg-[#F0EDE8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
              disabled={page === meta.last_page}
              className="p-2 rounded-lg border border-[#E2DDD5] text-[#6B7280] hover:bg-[#F0EDE8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
