import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, MapPin, Shield, PenLine, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { documentsService } from '@/services/documents.service'
import { StepIndicator } from '@/components/signing/StepIndicator'
import { SelfieCapture } from '@/components/signing/SelfieCapture'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import type { PublicDocumentResponse, SigningWizardData } from '@/types'

const STEPS = [
  { label: 'Boas-vindas' },
  { label: 'Documento' },
  { label: 'Aceite' },
  { label: 'Evidências' },
  { label: 'Confirmar' },
]

export default function Sign() {
  const { token } = useParams<{ token: string }>()

  const [step, setStep]           = useState(0)
  const [docData, setDocData]     = useState<PublicDocumentResponse | null>(null)
  const [pdfUrl, setPdfUrl]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmit]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  const [wizardData, setWizardData] = useState<SigningWizardData>({
    accepted_terms: false,
    latitude:       null,
    longitude:      null,
    timezone:       Intl.DateTimeFormat().resolvedOptions().timeZone,
    selfie_file:    null,
    selfie_preview: null,
  })

  // Carrega os dados do documento
  useEffect(() => {
    if (! token) return

    documentsService.getPublic(token)
      .then(res => { setDocData(res.data.data as any) })
      .catch(err => {
        const msg = err.response?.data?.message
        setError(msg ?? 'Link inválido ou expirado.')
      })
      .finally(() => setLoading(false))
  }, [token])

  // Carrega o PDF para o visualizador
  useEffect(() => {
    if (step !== 1 || ! token) return
    documentsService.getPublicPdf(token)
      .then(res => {
        const url = URL.createObjectURL(res.data as Blob)
        setPdfUrl(url)
      })
      .catch(() => setError('Não foi possível carregar o documento.'))
  }, [step, token])

  const requestGeolocation = useCallback(() => {
    if (! navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => {
        setWizardData(prev => ({
          ...prev,
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
        }))
      },
      () => { /* usuário negou — não é obrigatório */ },
    )
  }, [])

  useEffect(() => {
    if (step === 3) requestGeolocation()
  }, [step, requestGeolocation])

  const handleSubmit = useCallback(async () => {
    if (! token || ! wizardData.selfie_file) return
    setSubmit(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('accepted_terms', '1')
      form.append('selfie', wizardData.selfie_file)
      if (wizardData.latitude)  form.append('latitude',  String(wizardData.latitude))
      if (wizardData.longitude) form.append('longitude', String(wizardData.longitude))
      form.append('timezone', wizardData.timezone)

      await documentsService.submitClientSignature(token, form)
      setCompleted(true)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Ocorreu um erro ao processar sua assinatura.')
    } finally {
      setSubmit(false)
    }
  }, [token, wizardData])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#1B2E4B]" />
      </div>
    )
  }

  if (error && ! docData) {
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
            Assinado com Sucesso!
          </h1>
          <p className="text-[#6B7280] leading-relaxed">
            Sua assinatura foi registrada. Você receberá uma cópia do documento final por e-mail assim que o advogado concluir a assinatura digital.
          </p>
        </motion.div>
      </div>
    )
  }

  const doc = docData as any

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
              <p className="text-xs text-[#C9A84C] font-medium uppercase tracking-wide">Assinatura Eletrônica</p>
              <p className="text-sm font-semibold leading-tight">{doc?.document?.lawyer_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
            <Shield size={12} />
            <span>Lei 14.063/2020</span>
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
                  Olá, {doc?.client?.name?.split(' ')[0]}!
                </h1>
                <p className="text-[#6B7280] mb-6">
                  O(A) advogado(a) <strong className="text-[#1B2E4B]">{doc?.document?.lawyer_name}</strong>
                  {doc?.document?.oab_number ? ` (OAB ${doc.document.oab_number})` : ''} enviou um documento para você assinar eletronicamente.
                </p>

                <div className="bg-[#F8F7F4] rounded-lg p-4 border border-[#E2DDD5] mb-6">
                  <p className="text-xs text-[#6B7280] uppercase tracking-wide font-medium mb-1">Documento</p>
                  <p className="font-semibold text-[#1B2E4B] text-lg">{doc?.document?.title}</p>
                </div>

                <Alert variant="info" title="O que acontecerá a seguir">
                  <ol className="list-decimal list-inside space-y-1 mt-1 text-sm">
                    <li>Você lerá o documento na íntegra</li>
                    <li>Aceitará os termos explicitamente</li>
                    <li>Enviará uma selfie com seu documento de identidade</li>
                    <li>Confirmará e assinará eletronicamente</li>
                  </ol>
                </Alert>

                <Button className="mt-6 w-full" size="lg" onClick={() => setStep(1)}>
                  Começar →
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 1 — Visualização do documento */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-white rounded-xl shadow-sm border border-[#E2DDD5] overflow-hidden">
                <div className="p-4 border-b border-[#E2DDD5] bg-[#F8F7F4]">
                  <h2 className="font-semibold text-[#1B2E4B]">Leia o documento na íntegra</h2>
                </div>
                <div className="h-[500px] overflow-auto bg-gray-100 flex items-center justify-center">
                  {pdfUrl ? (
                    <iframe src={pdfUrl} className="w-full h-full border-0" title="Documento PDF" />
                  ) : (
                    <Loader2 size={28} className="animate-spin text-[#1B2E4B]" />
                  )}
                </div>
                <div className="p-4 border-t border-[#E2DDD5]">
                  <Button className="w-full" onClick={() => setStep(2)}>
                    Li o documento, continuar →
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
                    Ao assinar este documento eletronicamente, declaro que: (i) li e compreendi integralmente o conteúdo do documento <strong>{doc?.document?.title}</strong>;
                    (ii) concordo com todos os termos e condições nele estabelecidos; (iii) estou ciente de que minha assinatura eletrônica tem plena validade jurídica conforme
                    a Lei 14.063/2020; (iv) autorizo a coleta do meu endereço IP, geolocalização e imagem para fins de comprovação da autoria da assinatura.
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wizardData.accepted_terms}
                    onChange={e => setWizardData(prev => ({ ...prev, accepted_terms: e.target.checked }))}
                    className="mt-1 w-4 h-4 accent-[#1B2E4B]"
                  />
                  <span className="text-sm text-[#374151]">
                    <strong>Li e concordo</strong> com os termos do documento e com a declaração acima.
                  </span>
                </label>

                <div className="flex gap-3 mt-8">
                  <Button variant="ghost" onClick={() => setStep(1)}>← Voltar</Button>
                  <Button
                    className="flex-1"
                    disabled={! wizardData.accepted_terms}
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
                </p>

                {wizardData.latitude && wizardData.longitude && (
                  <div className="flex items-center gap-2 text-xs text-[#0F7A5A] mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <MapPin size={12} />
                    <span>Geolocalização capturada: {wizardData.latitude.toFixed(4)}, {wizardData.longitude.toFixed(4)}</span>
                  </div>
                )}

                <SelfieCapture
                  onCapture={(file, preview) =>
                    setWizardData(prev => ({ ...prev, selfie_file: file, selfie_preview: preview }))
                  }
                  preview={wizardData.selfie_preview}
                />

                <div className="flex gap-3 mt-8">
                  <Button variant="ghost" onClick={() => setStep(2)}>← Voltar</Button>
                  <Button
                    className="flex-1"
                    disabled={! wizardData.selfie_file}
                    onClick={() => setStep(4)}
                  >
                    Continuar →
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4 — Confirmação e assinatura */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-white rounded-xl shadow-sm border border-[#E2DDD5] p-8">
                <h2 className="text-xl font-bold text-[#1B2E4B] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Confirmar e Assinar
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm py-2 border-b border-[#E2DDD5]">
                    <span className="text-[#6B7280]">Documento</span>
                    <span className="font-medium text-[#1B2E4B]">{doc?.document?.title}</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-[#E2DDD5]">
                    <span className="text-[#6B7280]">Assinante</span>
                    <span className="font-medium text-[#1B2E4B]">{doc?.client?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-[#E2DDD5]">
                    <span className="text-[#6B7280]">CPF</span>
                    <span className="font-medium text-[#1B2E4B]">{doc?.client?.cpf}</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-[#E2DDD5]">
                    <span className="text-[#6B7280]">Termos aceitos</span>
                    <span className="text-[#0F7A5A] font-medium">✓ Sim</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-[#E2DDD5]">
                    <span className="text-[#6B7280]">Selfie com documento</span>
                    <span className="text-[#0F7A5A] font-medium">✓ Capturada</span>
                  </div>
                  <div className="flex justify-between text-sm py-2">
                    <span className="text-[#6B7280]">Geolocalização</span>
                    <span className={wizardData.latitude ? 'text-[#0F7A5A] font-medium' : 'text-[#6B7280]'}>
                      {wizardData.latitude ? '✓ Capturada' : 'Não informada'}
                    </span>
                  </div>
                </div>

                {error && <Alert variant="error" className="mb-4">{error}</Alert>}

                <Alert variant="warning" title="Ação irreversível">
                  Ao clicar em "Assinar", sua assinatura eletrônica será registrada de forma definitiva com todos os dados coletados acima.
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
                    Assinar Eletronicamente
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
