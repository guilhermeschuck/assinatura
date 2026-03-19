import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, FileText, Download, PenLine, Copy, Check, XCircle,
  MapPin, Globe, Clock, User, Shield, Hash, Camera, Loader2, Send
} from 'lucide-react'
import { documentsService } from '@/services/documents.service'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import type { Document, Signature } from '@/types'

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>()

  const [doc, setDoc]             = useState<Document | null>(null)
  const [loading, setLoading]     = useState(true)
  const [signing, setSigning]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const loadDoc = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await documentsService.get(Number(id))
      setDoc(res.data.data as any)
    } catch {
      setError('Documento não encontrado.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadDoc() }, [loadDoc])

  const handleSign = async () => {
    if (!doc) return
    setSigning(true)
    setError(null)
    try {
      await documentsService.signAsLawyer(doc.id)
      await loadDoc()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao assinar o documento.')
    } finally {
      setSigning(false)
    }
  }

  const handleCancel = async () => {
    if (!doc) return
    setCancelling(true)
    try {
      await documentsService.cancel(doc.id)
      await loadDoc()
      setShowCancel(false)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao cancelar.')
    } finally {
      setCancelling(false)
    }
  }

  const handleResend = async () => {
    if (!doc) return
    try {
      await documentsService.resendLink(doc.id)
      await loadDoc()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao reenviar.')
    }
  }

  const handleDownload = async () => {
    if (!doc) return
    try {
      const res = await documentsService.download(doc.id)
      const url = URL.createObjectURL(res.data as Blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `${doc.title.replace(/\s+/g, '_')}_assinado.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Erro ao baixar o documento.')
    }
  }

  const copyLink = () => {
    if (!doc) return
    navigator.clipboard.writeText(doc.signing_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 size={28} className="animate-spin text-[#1B2E4B]" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <Alert variant="error">Documento não encontrado.</Alert>
      </div>
    )
  }

  const clientSig = doc.client_signature as Signature | undefined
  const lawyerSig = doc.lawyer_signature as Signature | undefined

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Voltar */}
      <Link to="/documents" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1B2E4B] mb-4 transition-colors">
        <ArrowLeft size={14} /> Voltar para documentos
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#F0EDE8] rounded-xl flex items-center justify-center shrink-0">
            <FileText size={24} className="text-[#1B2E4B]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1B2E4B]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {doc.title}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={doc.status} />
              <span className="text-sm text-[#6B7280]">Criado em {fmt(doc.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 flex-wrap">
          {doc.status === 'pending' && (
            <>
              <Button variant="ghost" size="sm" icon={copied ? <Check size={14} className="text-[#0F7A5A]" /> : <Copy size={14} />} onClick={copyLink}>
                {copied ? 'Copiado!' : 'Copiar Link'}
              </Button>
              <Button variant="ghost" size="sm" icon={<Send size={14} />} onClick={handleResend}>
                Reenviar Link
              </Button>
              <Button variant="danger" size="sm" icon={<XCircle size={14} />} onClick={() => setShowCancel(true)}>
                Cancelar
              </Button>
            </>
          )}
          {doc.status === 'client_signed' && (
            <Button size="sm" icon={<PenLine size={14} />} loading={signing} onClick={handleSign}>
              Assinar com Certificado A1
            </Button>
          )}
          {(doc.status === 'completed' || doc.status === 'processing') && (
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleDownload} disabled={doc.status === 'processing'}>
              {doc.status === 'processing' ? 'Processando...' : 'Baixar Assinado'}
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {doc.status === 'processing' && (
        <Alert variant="info" className="mb-4" title="Assinatura em processamento">
          O sistema está aplicando a assinatura digital ICP-Brasil ao documento. Isso pode levar alguns instantes.
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados do Documento */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2DDD5]">
            <h2 className="font-semibold text-[#1B2E4B] flex items-center gap-2"><FileText size={16} /> Informações do Documento</h2>
          </div>
          <div className="p-5 space-y-3 text-sm">
            <Row label="Título" value={doc.title} />
            <Row label="Cliente" value={doc.client?.name ?? '—'} />
            <Row label="CPF do Cliente" value={doc.client?.cpf ?? '—'} />
            <Row label="E-mail do Cliente" value={doc.client?.email ?? '—'} />
            <Row label="Expira em" value={fmt(doc.expires_at)} />
            {doc.original_hash && (
              <div>
                <p className="text-[#6B7280] text-xs mb-0.5 flex items-center gap-1"><Hash size={10} /> Hash SHA-256 (original)</p>
                <p className="font-mono text-[10px] text-[#374151] bg-[#F9FAFB] rounded px-2 py-1 break-all">{doc.original_hash}</p>
              </div>
            )}
            {doc.final_hash && (
              <div>
                <p className="text-[#6B7280] text-xs mb-0.5 flex items-center gap-1"><Hash size={10} /> Hash SHA-256 (final)</p>
                <p className="font-mono text-[10px] text-[#0F7A5A] bg-emerald-50 rounded px-2 py-1 break-all">{doc.final_hash}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Assinatura do Cliente */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2DDD5]">
            <h2 className="font-semibold text-[#1B2E4B] flex items-center gap-2"><User size={16} /> Assinatura do Cliente</h2>
          </div>
          {clientSig ? (
            <div className="p-5 space-y-3 text-sm">
              <Row label="Nome" value={clientSig.signer_name ?? '—'} />
              <Row label="CPF" value={clientSig.signer_cpf ?? '—'} />
              <Row label="E-mail" value={clientSig.signer_email ?? '—'} />
              <Row label="Data/Hora" value={fmt(clientSig.signed_at)} icon={<Clock size={12} />} />
              <Row label="IP" value={clientSig.ip_address ?? '—'} icon={<Globe size={12} />} />
              <Row label="Geolocalização" value={clientSig.latitude && clientSig.longitude ? `${clientSig.latitude}, ${clientSig.longitude}` : 'Não informada'} icon={<MapPin size={12} />} />
              <Row label="Fuso Horário" value={clientSig.timezone ?? '—'} />
              {clientSig.user_agent && (
                <div>
                  <p className="text-[#6B7280] text-xs mb-0.5">User-Agent</p>
                  <p className="text-[10px] text-[#374151] bg-[#F9FAFB] rounded px-2 py-1 break-all">{clientSig.user_agent}</p>
                </div>
              )}
              {clientSig.selfie_url && (
                <div>
                  <p className="text-[#6B7280] text-xs mb-1 flex items-center gap-1"><Camera size={10} /> Selfie com Documento</p>
                  <img src={clientSig.selfie_url} alt="Selfie com documento de identificação" className="w-32 h-32 object-cover rounded-lg border-2 border-[#C9A84C]" />
                </div>
              )}
              <div className="pt-2 border-t border-[#E2DDD5]">
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-[#0F7A5A] px-2 py-1 rounded-full border border-emerald-200">
                  <Shield size={10} /> {clientSig.signature_type_label}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#9CA3AF]">
              <Clock size={28} className="mx-auto mb-2 text-[#E2DDD5]" />
              <p className="text-sm">Aguardando assinatura do cliente</p>
            </div>
          )}
        </motion.div>

        {/* Assinatura do Advogado */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm lg:col-span-2">
          <div className="px-5 py-4 border-b border-[#E2DDD5]">
            <h2 className="font-semibold text-[#1B2E4B] flex items-center gap-2"><Shield size={16} /> Assinatura Digital ICP-Brasil — Advogado</h2>
          </div>
          {lawyerSig ? (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Row label="Nome" value={lawyerSig.signer_name ?? '—'} />
              <Row label="Data/Hora" value={fmt(lawyerSig.signed_at)} icon={<Clock size={12} />} />
              <Row label="Tipo" value={lawyerSig.signature_type_label} />
              <Row label="Certificado" value={lawyerSig.certificate_id ? `ID #${lawyerSig.certificate_id}` : '—'} />
              {lawyerSig.document_hash && (
                <div className="sm:col-span-2">
                  <p className="text-[#6B7280] text-xs mb-0.5 flex items-center gap-1"><Hash size={10} /> Hash no momento da assinatura</p>
                  <p className="font-mono text-[10px] text-[#374151] bg-[#F9FAFB] rounded px-2 py-1 break-all">{lawyerSig.document_hash}</p>
                </div>
              )}
              <div className="sm:col-span-2 pt-2 border-t border-[#E2DDD5]">
                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                  <Shield size={10} /> Assinatura Digital Qualificada — ICP-Brasil (PAdES)
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#9CA3AF]">
              <Shield size={28} className="mx-auto mb-2 text-[#E2DDD5]" />
              <p className="text-sm">
                {doc.status === 'client_signed'
                  ? 'Pronto para sua assinatura digital'
                  : 'Aguardando etapa anterior'}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal de cancelamento */}
      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Cancelar Documento" maxWidth="sm">
        <p className="text-sm text-[#374151] mb-4">
          Tem certeza que deseja cancelar o documento <strong>{doc.title}</strong>? O link de assinatura será invalidado.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)}>Voltar</Button>
          <Button variant="danger" size="sm" loading={cancelling} onClick={handleCancel}>Confirmar Cancelamento</Button>
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-[#6B7280] flex items-center gap-1 shrink-0">{icon}{label}</span>
      <span className="text-[#1A1A2E] text-right">{value}</span>
    </div>
  )
}
