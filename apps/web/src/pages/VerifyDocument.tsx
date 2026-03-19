import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield, CheckCircle2, FileText, User, Scale, Hash,
  MapPin, Clock, Globe, Camera, PenLine, Loader2, AlertTriangle, ExternalLink,
} from 'lucide-react'
import { documentsService } from '@/services/documents.service'
import type { VerifyDocumentResponse } from '@/types'

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '—'

const statusLabels: Record<string, { label: string; color: string }> = {
  pending:        { label: 'Pendente',           color: 'bg-amber-100 text-amber-800' },
  client_signed:  { label: 'Cliente Assinou',    color: 'bg-blue-100 text-blue-800' },
  processing:     { label: 'Processando',        color: 'bg-blue-100 text-blue-800' },
  completed:      { label: 'Concluído',          color: 'bg-emerald-100 text-emerald-800' },
  expired:        { label: 'Expirado',           color: 'bg-gray-100 text-gray-600' },
  cancelled:      { label: 'Cancelado',          color: 'bg-red-100 text-red-700' },
}

export default function VerifyDocument() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<VerifyDocumentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    documentsService.verifyDocument(token)
      .then(res => setData(res.data.data as any))
      .catch(() => setError('Documento não encontrado ou token inválido.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#1B2E4B]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#1B2E4B] mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}>
            Documento Não Encontrado
          </h1>
          <p className="text-[#6B7280]">{error}</p>
        </div>
      </div>
    )
  }

  const status = statusLabels[data.document.status] ?? statusLabels.pending
  const isCompleted = data.document.status === 'completed'

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      <header className="bg-[#1B2E4B] text-white py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#C9A84C] rounded-md flex items-center justify-center">
              <Shield size={16} />
            </div>
            <div>
              <p className="text-xs text-[#C9A84C] font-medium uppercase tracking-wide">KoetzSing</p>
              <p className="text-sm font-semibold">Verificação de Autenticidade</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
            <Scale size={12} />
            <span>Lei 14.063/2020</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-6 text-center ${isCompleted
            ? 'bg-emerald-50 border-2 border-emerald-200'
            : 'bg-amber-50 border-2 border-amber-200'}`}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
            isCompleted ? 'bg-emerald-100' : 'bg-amber-100'
          }`}>
            {isCompleted
              ? <CheckCircle2 size={32} className="text-emerald-600" />
              : <AlertTriangle size={32} className="text-amber-600" />}
          </div>
          <h1 className="text-xl font-bold text-[#1B2E4B] mb-1"
              style={{ fontFamily: "'Playfair Display', serif" }}>
            {isCompleted ? 'Documento Autêntico e Válido' : 'Documento em Andamento'}
          </h1>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </motion.div>

        {/* Dados do Documento */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-[#E2DDD5] overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#F0EDE8] border-b border-[#E2DDD5] flex items-center gap-2">
            <FileText size={16} className="text-[#1B2E4B]" />
            <h2 className="font-semibold text-[#1B2E4B]">Documento</h2>
          </div>
          <div className="p-6 space-y-3">
            <Row label="Título" value={data.document.title} />
            <Row label="Criado em" value={fmt(data.document.created_at)} />
            {data.document.completed_at && (
              <Row label="Concluído em" value={fmt(data.document.completed_at)} />
            )}
            {data.document.original_hash && (
              <HashRow label="Hash SHA-256 (original)" value={data.document.original_hash} />
            )}
            {data.document.final_hash && (
              <HashRow label="Hash SHA-256 (final)" value={data.document.final_hash} />
            )}
          </div>
        </motion.section>

        {/* Assinatura do Cliente */}
        {data.client_signature && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-[#E2DDD5] overflow-hidden"
          >
            <div className="px-6 py-4 bg-[#F0EDE8] border-b border-[#E2DDD5] flex items-center gap-2">
              <User size={16} className="text-[#1B2E4B]" />
              <h2 className="font-semibold text-[#1B2E4B]">Assinatura Eletrônica — Cliente</h2>
            </div>
            <div className="p-6">
              <div className="flex gap-6">
                {/* Dados */}
                <div className="flex-1 space-y-3">
                  <Row label="Nome" value={data.client.name} />
                  <Row label="CPF" value={data.client.cpf} />
                  <Row label="E-mail" value={data.client.email} />
                  <Row label="Data/Hora" value={fmt(data.client_signature.signed_at)} />
                  {data.client_signature.ip_address && (
                    <Row label="IP" value={data.client_signature.ip_address} icon={<Globe size={13} />} />
                  )}
                  {data.client_signature.geolocation && (
                    <Row label="Geolocalização" value={data.client_signature.geolocation} icon={<MapPin size={13} />} />
                  )}
                  {data.client_signature.timezone && (
                    <Row label="Fuso Horário" value={data.client_signature.timezone} icon={<Clock size={13} />} />
                  )}
                  <div className="pt-1">
                    <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-2.5 py-1 rounded">
                      Assinatura Eletrônica Avançada — Lei 14.063/2020
                    </span>
                  </div>
                </div>

                {/* Selfie */}
                {data.client_signature.selfie_url && (
                  <div className="shrink-0 text-center">
                    <div className="w-24 h-24 rounded-lg border-2 border-[#C9A84C] overflow-hidden">
                      <img
                        src={data.client_signature.selfie_url}
                        alt="Selfie de identificação"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] text-[#6B7280] mt-1 flex items-center justify-center gap-1">
                      <Camera size={10} /> Selfie de identificação
                    </p>
                  </div>
                )}

                {/* Assinatura manuscrita */}
                {data.client_signature.signature_url && (
                  <div className="shrink-0 text-center">
                    <div className="w-28 h-20 rounded-lg border-2 border-[#C9A84C] overflow-hidden bg-white p-1">
                      <img
                        src={data.client_signature.signature_url}
                        alt="Assinatura manuscrita"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-[10px] text-[#6B7280] mt-1 flex items-center justify-center gap-1">
                      <PenLine size={10} /> Assinatura / Rubrica
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* Assinatura do Advogado */}
        {data.lawyer_signature && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-[#E2DDD5] overflow-hidden"
          >
            <div className="px-6 py-4 bg-[#F0EDE8] border-b border-[#E2DDD5] flex items-center gap-2">
              <Shield size={16} className="text-[#1B2E4B]" />
              <h2 className="font-semibold text-[#1B2E4B]">Assinatura Digital ICP-Brasil — Advogado</h2>
            </div>
            <div className="p-6 space-y-3">
              <Row label="Nome" value={data.lawyer.name} />
              {data.lawyer.oab_number && <Row label="OAB" value={data.lawyer.oab_number} />}
              <Row label="Data/Hora" value={fmt(data.lawyer_signature.signed_at)} />
              {data.lawyer_signature.certificate.subject && (
                <Row label="Certificado (Subject)" value={data.lawyer_signature.certificate.subject} />
              )}
              {data.lawyer_signature.certificate.issuer && (
                <Row label="Autoridade Emissora" value={data.lawyer_signature.certificate.issuer} />
              )}
              {data.lawyer_signature.certificate.valid_from && data.lawyer_signature.certificate.valid_until && (
                <Row
                  label="Validade do Certificado"
                  value={`${fmt(data.lawyer_signature.certificate.valid_from)} a ${fmt(data.lawyer_signature.certificate.valid_until)}`}
                />
              )}
              <div className="pt-1">
                <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-2.5 py-1 rounded">
                  Assinatura Digital Qualificada — MP 2.200-2/2001 (ICP-Brasil)
                </span>
              </div>
            </div>
          </motion.section>
        )}

        {/* Links de validação */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-[#E2DDD5] overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#F0EDE8] border-b border-[#E2DDD5] flex items-center gap-2">
            <Hash size={16} className="text-[#1B2E4B]" />
            <h2 className="font-semibold text-[#1B2E4B]">Validação Externa</h2>
          </div>
          <div className="p-6">
            <a
              href="https://validar.iti.gov.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#1B2E4B] hover:text-[#C9A84C] transition-colors font-medium"
            >
              <ExternalLink size={14} />
              Validar assinatura ICP-Brasil no portal do ITI (validar.iti.gov.br)
            </a>
            <p className="text-xs text-[#6B7280] mt-2">
              Faça upload do documento assinado (.pdf) no portal do ITI para verificar a conformidade
              da assinatura digital com o padrão ICP-Brasil.
            </p>
          </div>
        </motion.section>

        {/* Footer */}
        <div className="text-center text-xs text-[#6B7280] pb-6">
          <p>Este relatório de autenticidade foi gerado automaticamente pelo KoetzSing.</p>
          <p>Validade jurídica conforme MP 2.200-2/2001 (ICP-Brasil) e Lei 14.063/2020.</p>
        </div>
      </main>
    </div>
  )
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-[#6B7280] font-medium w-40 shrink-0 pt-0.5 flex items-center gap-1">
        {icon}{label}
      </span>
      <span className="text-sm text-[#1A1A2E]">{value}</span>
    </div>
  )
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-[#6B7280] font-medium w-40 shrink-0 pt-0.5">{label}</span>
      <code className="text-[10px] text-[#374151] bg-[#F9FAFB] px-2 py-1 rounded border border-[#E2DDD5] break-all font-mono">
        {value}
      </code>
    </div>
  )
}
