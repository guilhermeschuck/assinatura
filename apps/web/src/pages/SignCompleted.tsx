import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Download, FileText, Shield, Loader2, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { documentsService } from '@/services/documents.service'
import { Button } from '@/components/ui/Button'

export default function SignCompleted() {
  const { token } = useParams<{ token: string }>()
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    if (!token) return
    setDownloading(true)
    setError(null)
    try {
      const res = await documentsService.downloadPublicSigned(token)
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'documento_assinado.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Documento ainda não está disponível para download. Tente novamente em alguns instantes.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <header className="bg-[#1B2E4B] text-white py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#C9A84C] rounded-md flex items-center justify-center">
              <FileText size={16} />
            </div>
            <p className="text-xs text-[#C9A84C] font-medium uppercase tracking-wide">KoetzSing</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
            <Shield size={12} />
            <span>Lei 14.063/2020</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-lg p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 size={40} className="text-[#0F7A5A]" />
          </motion.div>

          <h1
            className="text-2xl font-bold text-[#1B2E4B] mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Documento Concluído!
          </h1>

          <p className="text-[#6B7280] leading-relaxed mb-6">
            Todas as assinaturas foram aplicadas. Clique no botão abaixo para baixar o documento assinado.
          </p>

          {error && (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 rounded-lg p-3 mb-4">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleDownload}
            icon={downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            disabled={downloading}
            className="w-full"
          >
            {downloading ? 'Baixando...' : 'Baixar Documento Assinado'}
          </Button>

          <p className="text-xs text-[#6B7280] mt-4">
            Este documento tem validade jurídica conforme a Lei 14.063/2020 e a MP 2.200-2/2001 (ICP-Brasil).
          </p>
        </motion.div>
      </main>
    </div>
  )
}
