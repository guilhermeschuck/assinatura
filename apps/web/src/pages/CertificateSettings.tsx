import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Upload, X, CheckCircle2, Clock, Trash2, FileText, Loader2 } from 'lucide-react'
import { certificatesService } from '@/services/certificates.service'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import type { Certificate } from '@/types'

export default function CertificateSettings() {
  const [certificates, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading]    = useState(true)
  const [error, setError]        = useState<string | null>(null)
  const [success, setSuccess]    = useState<string | null>(null)

  // Upload state
  const [showUpload, setShowUpload] = useState(false)
  const [pfxFile, setPfxFile]       = useState<File | null>(null)
  const [password, setPassword]     = useState('')
  const [uploading, setUploading]   = useState(false)

  const loadCerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await certificatesService.list()
      setCerts((res.data as any).data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCerts() }, [loadCerts])

  const handleUpload = async () => {
    if (!pfxFile || !password) {
      setError('Selecione o arquivo .pfx e informe a senha.')
      return
    }
    setUploading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('pfx_file', pfxFile)
    formData.append('password', password)

    try {
      await certificatesService.upload(formData)
      setSuccess('Certificado configurado com sucesso!')
      setShowUpload(false)
      setPfxFile(null)
      setPassword('')
      loadCerts()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao enviar o certificado.')
    } finally {
      setUploading(false)
    }
  }

  const handleDeactivate = async (id: number) => {
    try {
      await certificatesService.deactivate(id)
      loadCerts()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao desativar.')
    }
  }

  const activeCert = certificates.find(c => c.is_active)
  const inactiveCerts = certificates.filter(c => !c.is_active)

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

  const daysUntil = (d: string | null) => {
    if (!d) return null
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2E4B]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Certificado Digital A1
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">Configure seu certificado ICP-Brasil para assinatura digital</p>
        </div>
        <Button icon={<Upload size={16} />} onClick={() => { setShowUpload(true); setError(null); setSuccess(null) }}>
          {activeCert ? 'Trocar Certificado' : 'Enviar Certificado'}
        </Button>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {/* Certificado ativo */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 size={28} className="animate-spin text-[#1B2E4B]" />
        </div>
      ) : activeCert ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border-2 border-[#0F7A5A] shadow-sm overflow-hidden mb-6"
        >
          <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0F7A5A] rounded-lg flex items-center justify-center">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-[#0F7A5A]">Certificado Ativo</p>
                <p className="text-xs text-emerald-700">Pronto para assinaturas digitais</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs bg-white text-[#0F7A5A] px-3 py-1 rounded-full border border-emerald-200 font-medium">
              <CheckCircle2 size={12} /> ICP-Brasil
            </span>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#6B7280] mb-0.5">Titular (CN)</p>
                <p className="font-medium text-[#1B2E4B]">{activeCert.subject ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-0.5">Autoridade Emissora</p>
                <p className="font-medium text-[#1B2E4B]">{activeCert.issuer ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-0.5">CPF/CNPJ</p>
                <p className="font-medium text-[#1B2E4B]">{activeCert.cpf_cnpj ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-0.5">Número de Série</p>
                <p className="font-mono text-xs text-[#374151]">{activeCert.serial_number ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-0.5">Válido de</p>
                <p className="font-medium text-[#1B2E4B]">{fmtDate(activeCert.valid_from)}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-0.5">Válido até</p>
                <p className="font-medium text-[#1B2E4B]">{fmtDate(activeCert.valid_until)}</p>
              </div>
            </div>

            {/* Alerta de expiração */}
            {(() => {
              const days = daysUntil(activeCert.valid_until)
              if (days === null) return null
              if (days <= 0) {
                return (
                  <Alert variant="error" title="Certificado expirado">
                    Seu certificado expirou. Envie um novo certificado para continuar assinando documentos.
                  </Alert>
                )
              }
              if (days <= 30) {
                return (
                  <Alert variant="warning" title={`Certificado expira em ${days} dias`}>
                    Providencie a renovação para evitar interrupções.
                  </Alert>
                )
              }
              return (
                <div className="flex items-center gap-2 text-xs text-[#0F7A5A] bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <Clock size={12} />
                  <span>{days} dias restantes de validade</span>
                </div>
              )
            })()}

            <div className="flex justify-end pt-2 border-t border-[#E2DDD5]">
              <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDeactivate(activeCert.id)}>
                Desativar
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm p-12 text-center mb-6"
        >
          <ShieldCheck size={56} className="text-[#E2DDD5] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#1B2E4B] mb-2">Nenhum certificado configurado</h2>
          <p className="text-sm text-[#6B7280] mb-4 max-w-md mx-auto">
            Para assinar documentos digitalmente com validade jurídica (ICP-Brasil), envie seu Certificado Digital A1 (.pfx/.p12).
          </p>
          <Button icon={<Upload size={16} />} onClick={() => setShowUpload(true)}>Enviar Certificado A1</Button>
        </motion.div>
      )}

      {/* Certificados inativos */}
      {inactiveCerts.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2DDD5] bg-[#FDFCF9]">
            <h3 className="font-semibold text-[#6B7280] text-sm">Certificados Anteriores</h3>
          </div>
          <div className="divide-y divide-[#E2DDD5]">
            {inactiveCerts.map(c => (
              <div key={c.id} className="px-6 py-3 flex items-center justify-between text-sm opacity-60">
                <div>
                  <p className="font-medium text-[#374151]">{c.subject}</p>
                  <p className="text-xs text-[#6B7280]">{c.issuer} · Válido até {fmtDate(c.valid_until)}</p>
                </div>
                <span className="text-xs text-[#9CA3AF] bg-gray-100 px-2 py-0.5 rounded-full">Inativo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info legal */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-900 text-sm mb-2">Sobre o Certificado A1</h3>
        <ul className="text-xs text-blue-800 space-y-1.5 leading-relaxed">
          <li>O Certificado Digital A1 (arquivo .pfx/.p12) é emitido por uma Autoridade Certificadora credenciada pelo ICP-Brasil.</li>
          <li>Tem validade de 1 ano e é armazenado em arquivo digital protegido por senha.</li>
          <li>Garante assinatura digital com presunção de veracidade conforme MP 2.200-2/2001.</li>
          <li>A senha do certificado é armazenada de forma criptografada (AES-256) e nunca é exposta.</li>
        </ul>
      </div>

      {/* Modal de upload */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Enviar Certificado A1">
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div
            className={[
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
              pfxFile ? 'border-[#0F7A5A] bg-emerald-50' : 'border-[#E2DDD5] hover:border-[#C9A84C]',
            ].join(' ')}
            onClick={() => document.getElementById('pfx-input')?.click()}
          >
            {pfxFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={20} className="text-[#0F7A5A]" />
                <span className="font-medium text-[#0F7A5A]">{pfxFile.name}</span>
                <button onClick={e => { e.stopPropagation(); setPfxFile(null) }}>
                  <X size={14} className="text-red-500" />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} className="text-[#C9A84C] mx-auto mb-2" />
                <p className="text-sm font-medium text-[#1B2E4B]">Clique para selecionar o arquivo .pfx ou .p12</p>
                <p className="text-xs text-[#6B7280]">Máximo 5 MB</p>
              </>
            )}
            <input
              id="pfx-input"
              type="file"
              accept=".pfx,.p12"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) setPfxFile(e.target.files[0]) }}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#1A1A2E] mb-1.5 block">Senha do Certificado</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-md text-sm border border-[#E2DDD5] bg-white focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
            />
          </div>

          <Alert variant="info">
            A senha será criptografada com AES-256 e armazenada de forma segura. Ela nunca é exibida ou registrada em logs.
          </Alert>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancelar</Button>
            <Button loading={uploading} onClick={handleUpload} icon={<ShieldCheck size={16} />}>
              Enviar e Configurar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
