import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Clock, CheckCircle2, AlertTriangle, Plus, ArrowRight } from 'lucide-react'
import { documentsService } from '@/services/documents.service'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import type { Document } from '@/types'

interface Stats {
  total: number
  pending: number
  client_signed: number
  completed: number
}

const statCards = (stats: Stats) => [
  { label: 'Total',              value: stats.total,         icon: FileText,     color: 'bg-[#EEF2F7] text-[#1B2E4B]' },
  { label: 'Aguardando Cliente', value: stats.pending,       icon: Clock,        color: 'bg-amber-50 text-amber-700' },
  { label: 'Aguardando Você',    value: stats.client_signed, icon: AlertTriangle, color: 'bg-blue-50 text-blue-700' },
  { label: 'Concluídos',         value: stats.completed,     icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700' },
]

export default function Dashboard() {
  const user = useAuthStore(s => s.user)

  const [stats, setStats]       = useState<Stats>({ total: 0, pending: 0, client_signed: 0, completed: 0 })
  const [documents, setDocs]    = useState<Document[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      documentsService.stats(),
      documentsService.list({ page: 1 }),
    ]).then(([statsRes, docsRes]) => {
      setStats(statsRes.data.data as any)
      setDocs((docsRes.data as any).data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Saudação */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-sm text-[#6B7280] mb-1">Bem-vindo de volta</p>
          <h1 className="text-3xl font-bold text-[#1B2E4B]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {user?.name}
          </h1>
          {user?.oab_number && <p className="text-sm text-[#C9A84C] font-medium mt-1">OAB {user.oab_number}</p>}
        </div>
        <Link to="/documents/new">
          <Button icon={<Plus size={16} />}>Novo Documento</Button>
        </Link>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards(stats).map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white rounded-xl border border-[#E2DDD5] p-5 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-[#1A1A2E]">
              {loading ? '—' : card.value}
            </p>
            <p className="text-xs text-[#6B7280] font-medium mt-0.5">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Ação urgente — documentos aguardando assinatura do advogado */}
      {stats.client_signed > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#EFF6FF] border border-blue-200 rounded-xl p-5 mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={20} className="text-blue-700" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">
                {stats.client_signed} documento{stats.client_signed > 1 ? 's' : ''} aguardando sua assinatura
              </p>
              <p className="text-sm text-blue-700">O cliente já assinou. Agora é a sua vez.</p>
            </div>
          </div>
          <Link to="/documents?status=client_signed">
            <Button variant="secondary" size="sm" icon={<ArrowRight size={14} />}>
              Ver agora
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Últimos documentos */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2DDD5] flex items-center justify-between">
          <h2 className="font-semibold text-[#1B2E4B]">Documentos Recentes</h2>
          <Link to="/documents" className="text-sm text-[#C9A84C] font-medium hover:underline">
            Ver todos →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#6B7280]">Carregando...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={40} className="text-[#E2DDD5] mx-auto mb-3" />
            <p className="text-[#6B7280] text-sm">Nenhum documento criado ainda.</p>
            <Link to="/documents/new">
              <Button variant="ghost" size="sm" className="mt-3">Criar primeiro documento</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#E2DDD5]">
            {documents.slice(0, 6).map((doc) => (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-[#FDFCF9] transition-colors"
              >
                <div className="w-9 h-9 bg-[#F0EDE8] rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-[#1B2E4B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1B2E4B] truncate">{doc.title}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{doc.client?.name}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={doc.status} />
                  <ArrowRight size={14} className="text-[#C9A84C]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
