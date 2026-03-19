import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, MapPin, Shield, PenLine, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { documentsService } from '@/services/documents.service'
import { StepIndicator } from '@/components/signing/StepIndicator'
import { SelfieCapture } from '@/components/signing/SelfieCapture'
import { SignaturePad } from '@/components/signing/SignaturePad'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import type { BatchDocumentResponse, BatchDocumentEntry, SigningWizardData } from '@/types'

const STEPS = [
  { label: 'Boas-vindas' },
  { label: 'Documentos' },
  { label: 'Aceite' },
  { label: 'Evidências' },
  { label: 'Confirmar' },
]

export default function BatchSign() {
  const { batchToken } = useParams<{ batchToken: string }>()

  const [step, setStep]           = useState(0)
  const [batchData, setBatchData] = useState<BatchDocumentResponse | null>(null)
  const [pdfUrls, setPdfUrls]     = useState<Record<number, string>>({})
  const [activeDocId, setActiveDocId] = useState<number | null>(null)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmit]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  const [wizardData, setWizardData] = useState<SigningWizardData>({
    accepted_terms:     false,
    latitude:           null,
    longitude:          null,
    timezone:           Intl.DateTimeFormat().resolvedOptions().timeZone,
    selfie_file:        null,
    selfie_preview:     null,
    signature_file:     null,
    signature_preview:  null,
  })
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  // Carrega dados do lote
  useEffect(() => {
    if (!batchToken) return

    documentsService.getBatchPublic(batchToken)
      .then(res => {
        const data = res.data.data as any as BatchDocumentResponse
        setBatchData(data)
        if (data.documents.length > 0) {
          setActiveDocId(data.documents[0].id)
        }
      })
      .catch(err => {
        setError(err.response?.data?.message ?? 'Link inválido ou expirado.')
      })
      .finally(() => setLoading(false))
  }, [batchToken])

  // Carrega PDF do documento ativo quando no step de visualização
  useEffect(() => {
    if (step !== 1 || !batchToken || !activeDocId) return
    if (pdfUrls[activeDocId]) return // já carregou

    documentsService.getBatchPdf(batchToken, activeDocId)
      .then(res => {
        const url = URL.createObjectURL(res.data as Blob)
        setPdfUrls(prev => ({ ...prev, [activeDocId]: url }))
      })
      .catch(() => setError('Não foi possível carregar o documento.'))
  }, [step, batchToken, activeDocId, pdfUrls])

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Seu navegador não suporta geolocalização.')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setWizardData(prev => ({
          ...prev,
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
        }))
        setGeoLoading(false)
      },
      () => {
        setGeoError('Geolocalização é obrigatória para prosseguir. Permita o acesso à localização e tente novamente.')
        setGeoLoading(false)
      },
    )
  }, [])

  useEffect(() => {
    if (step === 3) requestGeolocation()
  }, [step, requestGeolocation])

  const handleSubmit = useCallback(async () => {
    if (!batchToken || !wizardData.selfie_file || !wizardData.signature_file || !wizardData.latitude || !wizardData.longitude) return
    setSubmit(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('accepted_terms', '1')
      form.append('selfie', wizardData.selfie_file)
      form.append('signature', wizardData.signature_file)
      form.append('latitude', String(wizardData.latitude))
      form.append('longitude', String(wizardData.longitude))
      form.append('timezone', wizardData.timezone)

      await documentsService.submitBatchClientSignature(batchToken, form)
      setCompleted(true)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Ocorreu um erro ao processar sua assinatura.')
    } finally {
      setSubmit(false)
    }
  }, [batchToken, wizardData])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#1B2E4B]" />
      </div>
    )
  }

  if (error && !batchData) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#1B2E4B] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Link Indisponível
          </h1>
          <p className="text-[#6B7280]">{error}</p>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 size={40} className="text-[#0F7A5A]" />
          </motion.div>
          <h1 className="text-2xl font-bold text-[#1B2E4B] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            {batchData?.pending_documents} Documento(s) Assinado(s)!
          </h1>
          <p className="text-[#6B7280] leading-relaxed">
            Suas assinaturas foram registradas com sucesso. Você receberá uma cópia de cada documento final por e-mail assim que o advogado concluir as assinaturas digitais.
          </p>
        </motion.div>
      </div>
    )
  }

  const docs = batchData?.documents ?? []

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      <header className="bg-[#1B2E4B] text-white py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#C9A84C] rounded-md flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div>
              <p className="text-xs text-[#C9A84C] font-medium uppercase tracking-wide">KoetzSing</p>
              <p className="text-sm font-semibold leading-tight">{batchData?.document?.lawyer_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#C9A84C]/20 text-[#C9A84C] rounded-full px-2.5 py-0.5 font-medium">
              {docs.length} docs
            </span>
            <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
              <Shield size={12} />
              <span>Lei 14.063/2020</span>
            </div>
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className="bg-white border-b border-[#E2DDD5] py-4">
        <div className="max-w-2xl mx-auto px-6 flex justify-center">
          <StepIndicator steps={STEPS} currentStep={step} />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">

          {/* Step 0 — Boas-vindas */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-white rounded-xl shadow-sm border border-[#E2DDD5] p-8">
                <h1 className="text-2xl font-bold text-[#1B2E4B] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Olá, {batchData?.client?.name?.split(' ')[0]}!
                </h1>
                <p className="text-[#6B7280] mb-6">
                  O(A) advogado(a) <strong className="text-[#1B2E4B]">{batchData?.document?.lawyer_name}</strong>
                  {batchData?.document?.oab_number ? ` (OAB ${batchData.document.oab_number})` : ''} enviou <strong className="text-[#1B2E4B]">{docs.length} documentos</strong> para você assinar eletronicamente.
                </p>

                <div className="bg-[#F8F7F4] rounded-lg p-4 border border-[#E2DDD5] mb-6">
                  <p className="text-xs text-[#6B7280] uppercase tracking-wide font-medium mb-2">Documentos para assinatura</p>
                  <ul className="space-y-1.5">
                    {docs.map((doc: BatchDocumentEntry, i: number) => (
                      <li key={doc.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 bg-[#1B2E4B] text-white rounded-full flex items-center justify-center text-xs font-medium">{i + 1}</span>
                        <span className="font-medium text-[#1B2E4B]">{doc.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Alert variant="info" title="O que acontecerá a seguir">
                  <ol className="list-decimal list-inside space-y-1 mt-1 text-sm">
                    <li>Você lerá cada documento na íntegra</li>
                    <li>Aceitará os termos de todos os documentos</li>
                    <li>Enviará uma selfie com seu documento de identidade</li>
                    <li>Assinará / rubricará na tela</li>
                    <li>Confirmará e assinará todos eletronicamente</li>
                  </ol>
                </Alert>

                <Button className="mt-6 w-full" size="lg" onClick={() => setStep(1)}>
                  Começar →
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 1 — Visualização dos documentos (abas) */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-white rounded-xl shadow-sm border border-[#E2DDD5] overflow-hidden">
                <div className="p-4 border-b border-[#E2DDD5] bg-[#F8F7F4]">
                  <h2 className="font-semibold text-[#1B2E4B] mb-3">Leia cada documento na íntegra</h2>
                  {/* Abas dos documentos */}
                  <div className="flex gap-1 flex-wrap">
                    {docs.map((doc: BatchDocumentEntry, i: number) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setActiveDocId(doc.id)}
                        className={[
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          activeDocId === doc.id
                            ? 'bg-[#1B2E4B] text-white'
                            : 'bg-white text-[#6B7280] hover:bg-[#E2DDD5]',
                        ].join(' ')}
                      >
                        {i + 1}. {doc.title.length > 25 ? doc.title.slice(0, 25) + '…' : doc.title}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[500px] overflow-auto bg-gray-100 flex items-center justify-center">
                  {activeDocId && pdfUrls[activeDocId] ? (
                    <iframe src={pdfUrls[activeDocId]} className="w-full h-full border-0" title="Documento PDF" />
                  ) : (
                    <Loader2 size={28} className="animate-spin text-[#1B2E4B]" />
                  )}
                </div>
                <div className="p-4 border-t border-[#E2DDD5]">
                  <Button className="w-full" onClick={() => setStep(2)}>
                    Li todos os documentos, continuar →
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Aceite dos termos */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-white rounded-xl shadow-sm border border-[#E2DDD5] p-8">
                <h2 className="text-xl font-bold text-[#1B2E4B] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Aceite dos Termos
                </h2>

                <div className="bg-[#F8F7F4] border border-[#E2DDD5] rounded-lg p-4 max-h-48 overflow-y-auto mb-6 text-sm text-[#374151] leading-relaxed">
                  <p className="font-semibold mb-2">Declaração de Aceite</p>
                  <p>
                    Ao assinar estes documentos eletronicamente, declaro que: (i) li e compreendi integralmente o conteúdo dos {docs.length} documentos listados abaixo;
                    (ii) concordo com todos os termos e condições neles estabelecidos; (iii) estou ciente de que minha assinatura eletrônica tem plena validade jurídica conforme
                    a Lei 14.063/2020; (iv) autorizo a coleta do meu endereço IP, geolocalização e imagem para fins de comprovação da autoria da assinatura.
                  </p>
                  <ul className="mt-3 space-y-1">
                    {docs.map((doc: BatchDocumentEntry, i: number) => (
                      <li key={doc.id} className="text-[#1B2E4B] font-medium">{i + 1}. {doc.title}</li>
                    ))}
                  </ul>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wizardData.accepted_terms}
                    onChange={e => setWizardData(prev => ({ ...prev, accepted_terms: e.target.checked }))}
                    className="mt-1 w-4 h-4 accent-[#1B2E4B]"
                  />
                  <span className="text-sm text-[#374151]">
                    <strong>Li e concordo</strong> com os termos de todos os {docs.length} documentos e com a declaração acima.
                  </span>
                </label>

                <div className="flex gap-3 mt-8">
                  <Button variant="ghost" onClick={() => setStep(1)}>← Voltar</Button>
                  <Button
                    className="flex-1"
                    disabled={!wizardData.accepted_terms}
                    onClick={() => setStep(3)}
                  >
                    Aceitar e continuar →
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Captura de evidências */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-white rounded-xl shadow-sm border border-[#E2DDD5] p-8">
                <h2 className="text-xl font-bold text-[#1B2E4B] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Comprovação de Identidade
                </h2>
                <p className="text-sm text-[#6B7280] mb-6">
                  Essa etapa é necessária para garantir a validade jurídica da sua assinatura eletrônica (Lei 14.063/2020).
                  As evidências serão aplicadas a todos os {docs.length} documentos.
                </p>

                {/* Geolocalização */}
                {wizardData.latitude && wizardData.longitude ? (
                  <div className="flex items-center gap-2 text-xs text-[#0F7A5A] mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <MapPin size={12} />
                    <span>Geolocalização capturada: {wizardData.latitude.toFixed(4)}, {wizardData.longitude.toFixed(4)}</span>
                  </div>
                ) : (
                  <div className="mb-4">
                    {geoError && <Alert variant="error" className="mb-3">{geoError}</Alert>}
                    <div className="flex items-center gap-2 text-xs text-amber-700 mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <MapPin size={12} />
                      <span>Geolocalização é obrigatória para prosseguir.</span>
                    </div>
                    <Button size="sm" variant="ghost" icon={<MapPin size={14} />} loading={geoLoading} onClick={requestGeolocation}>
                      Permitir Geolocalização
                    </Button>
                  </div>
                )}

                {/* Selfie */}
                <SelfieCapture
                  onCapture={(file, preview) =>
                    setWizardData(prev => ({ ...prev, selfie_file: file ?? null, selfie_preview: preview ?? null }))
                  }
                  preview={wizardData.selfie_preview}
                />

                {/* Assinatura */}
                <div className="mt-6 pt-6 border-t border-[#E2DDD5]">
                  <h3 className="text-sm font-semibold text-[#1B2E4B] mb-3">Assinatura / Rubrica</h3>
                  <SignaturePad
                    onCapture={(file, preview) =>
                      setWizardData(prev => ({ ...prev, signature_file: file ?? null, signature_preview: preview ?? null }))
                    }
                    preview={wizardData.signature_preview}
                  />
                </div>

                <div className="flex gap-3 mt-8">
                  <Button variant="ghost" onClick={() => setStep(2)}>← Voltar</Button>
                  <Button
                    className="flex-1"
                    disabled={!wizardData.selfie_file || !wizardData.signature_file || !wizardData.latitude || !wizardData.longitude}
                    onClick={() => setStep(4)}
                  >
                    Continuar →
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4 — Confirmação */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-white rounded-xl shadow-sm border border-[#E2DDD5] p-8">
                <h2 className="text-xl font-bold text-[#1B2E4B] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Confirmar e Assinar {docs.length} Documentos
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="text-sm py-2 border-b border-[#E2DDD5]">
                    <span className="text-[#6B7280] block mb-1">Documentos</span>
                    <ul className="space-y-1">
                      {docs.map((doc: BatchDocumentEntry, i: number) => (
                        <li key={doc.id} className="font-medium text-[#1B2E4B] text-sm flex items-center gap-2">
                          <span className="w-4 h-4 bg-[#1B2E4B] text-white rounded-full flex items-center justify-center text-[10px]">{i + 1}</span>
                          {doc.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-[#E2DDD5]">
                    <span className="text-[#6B7280]">Assinante</span>
                    <span className="font-medium text-[#1B2E4B]">{batchData?.client?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-[#E2DDD5]">
                    <span className="text-[#6B7280]">CPF</span>
                    <span className="font-medium text-[#1B2E4B]">{batchData?.client?.cpf}</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-[#E2DDD5]">
                    <span className="text-[#6B7280]">Termos aceitos</span>
                    <span className="text-[#0F7A5A] font-medium">✓ Sim ({docs.length} documentos)</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-[#E2DDD5]">
                    <span className="text-[#6B7280]">Selfie com documento</span>
                    <span className="text-[#0F7A5A] font-medium">✓ Capturada</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-[#E2DDD5]">
                    <span className="text-[#6B7280]">Assinatura / Rubrica</span>
                    <span className="text-[#0F7A5A] font-medium">✓ Capturada</span>
                  </div>
                  <div className="flex justify-between text-sm py-2">
                    <span className="text-[#6B7280]">Geolocalização</span>
                    <span className="text-[#0F7A5A] font-medium">✓ Capturada</span>
                  </div>
                </div>

                {error && <Alert variant="error" className="mb-4">{error}</Alert>}

                <Alert variant="warning" title="Ação irreversível">
                  Ao clicar em "Assinar", sua assinatura eletrônica será registrada de forma definitiva para todos os {docs.length} documentos com todos os dados coletados acima.
                </Alert>

                <div className="flex gap-3 mt-6">
                  <Button variant="ghost" onClick={() => setStep(3)} disabled={submitting}>← Voltar</Button>
                  <Button
                    className="flex-1"
                    size="lg"
                    icon={<PenLine size={18} />}
                    loading={submitting}
                    onClick={handleSubmit}
                  >
                    Assinar {docs.length} Documentos
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  )
}
