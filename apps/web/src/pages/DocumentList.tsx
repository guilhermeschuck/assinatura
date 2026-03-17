import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Plus, Search, Filter, ArrowRight, Clock, Copy, Check } from 'lucide-react'
import { documentsService } from '@/services/documents.service'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Document, DocumentStatus, PaginatedResponse } from '@/types'

const STATUS_FILTERS: { label: string; value: DocumentStatus | '' }[] = [
  { label: 'Todos',               value: '' },
  { label: 'Aguardando Cliente',  value: 'pending' },
  { label: 'Aguardando Advogado', value: 'client_signed' },
  { label: 'Concluídos',          value: 'completed' },
  { label: 'Expirados',           value: 'expired' },
  { label: 'Cancelados',          value: 'cancelled' },
]

export default function DocumentList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || ''

  const [documents, setDocs]   = useState<Document[]>([])
  const [loading, setLoading]  = useState(true)
  const [search, setSearch]    = useState('')
  const [status, setStatus]    = useState(initialStatus)
  const [meta, setMeta]        = useState<PaginatedResponse<Document>['meta'] | null>(null)
  const [page, setPage]        = useState(1)
  const [copiedId, setCopied]  = useState<number | null>(null)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await documentsService.list({ status: status || undefined, search: search || undefined, page })
      const data = res.data as any
      setDocs(data.data ?? [])
      setMeta(data.meta ?? null)
    } finally {
      setLoading(false)
    }
  }, [status, search, page])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  const handleFilterChange = (newStatus: string) => {
    setStatus(newStatus)
    setPage(1)
    if (newStatus) {
      setSearchParams({ status: newStatus })
    } else {
      setSearchParams({})
    }
  }

  const copyLink = (doc: Document) => {
    navigator.clipboard.writeText(doc.signing_url)
    setCopied(doc.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2E4B]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Documentos
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">Gerencie seus documentos e acompanhe as assinaturas</p>
        </div>
        <Link to="/documents/new">
          <Button icon={<Plus size={16} />}>Novo Documento</Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Buscar por título ou cliente..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#E2DDD5] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] focus:border-transparent bg-white"
            />
          </div>
          {/* Filtro de status */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                  status === f.value
                    ? 'bg-[#1B2E4B] text-white'
                    : 'bg-[#F0EDE8] text-[#6B7280] hover:bg-[#E2DDD5]',
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#6B7280]">Carregando documentos...</div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="text-[#E2DDD5] mx-auto mb-4" />
            <p className="text-[#6B7280] mb-1 font-medium">Nenhum documento encontrado</p>
            <p className="text-sm text-[#9CA3AF]">
              {search || status ? 'Tente ajustar os filtros.' : 'Crie seu primeiro documento para começar.'}
            </p>
            {!search && !status && (
              <Link to="/documents/new">
                <Button variant="ghost" size="sm" className="mt-4">Criar documento</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Header da tabela */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#E2DDD5] bg-[#FDFCF9] text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
              <div className="col-span-4">Documento</div>
              <div className="col-span-2">Cliente</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Criado em</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>

            {/* Linhas */}
            <div className="divide-y divide-[#E2DDD5]">
              {documents.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-[#FDFCF9] transition-colors items-center"
                >
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-[#F0EDE8] rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={16} className="text-[#1B2E4B]" />
                    </div>
                    <Link to={`/documents/${doc.id}`} className="min-w-0">
                      <p className="font-medium text-[#1B2E4B] truncate hover:text-[#C9A84C] transition-colors">{doc.title}</p>
                    </Link>
                  </div>

                  <div className="col-span-2">
                    <p className="text-sm text-[#374151]">{doc.client?.name ?? '—'}</p>
                    <p className="text-xs text-[#9CA3AF]">{doc.client?.cpf}</p>
                  </div>

                  <div className="col-span-2">
                    <StatusBadge status={doc.status} />
                  </div>

                  <div className="col-span-2">
                    <p className="text-sm text-[#6B7280]">{formatDate(doc.created_at)}</p>
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {doc.status === 'pending' && (
                      <button
                        onClick={() => copyLink(doc)}
                        className="p-1.5 rounded-md text-[#6B7280] hover:bg-[#F0EDE8] hover:text-[#1B2E4B] transition-colors"
                        title="Copiar link de assinatura"
                      >
                        {copiedId === doc.id ? <Check size={14} className="text-[#0F7A5A]" /> : <Copy size={14} />}
                      </button>
                    )}
                    <Link
                      to={`/documents/${doc.id}`}
                      className="p-1.5 rounded-md text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-colors"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Paginação */}
            {meta && meta.last_page > 1 && (
              <div className="px-6 py-4 border-t border-[#E2DDD5] flex items-center justify-between text-sm">
                <p className="text-[#6B7280]">
                  Mostrando {(meta.current_page - 1) * meta.per_page + 1}–{Math.min(meta.current_page * meta.per_page, meta.total)} de {meta.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={meta.current_page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
