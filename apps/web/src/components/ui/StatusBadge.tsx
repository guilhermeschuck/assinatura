import type { DocumentStatus } from '@/types'

const config: Record<DocumentStatus, { label: string; classes: string }> = {
  pending:       { label: 'Aguardando Cliente',   classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  client_signed: { label: 'Aguardando Advogado',  classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  processing:    { label: 'Processando...',        classes: 'bg-purple-50 text-purple-700 border-purple-200' },
  completed:     { label: 'Concluído',             classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expired:       { label: 'Expirado',              classes: 'bg-gray-50 text-gray-500 border-gray-200' },
  cancelled:     { label: 'Cancelado',             classes: 'bg-red-50 text-red-600 border-red-200' },
} as Record<string, { label: string; classes: string }>

interface StatusBadgeProps {
  status: DocumentStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, classes } = config[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600 border-gray-200' }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      {label}
    </span>
  )
}
