import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Server, Lock, Eye, EyeOff, Save, CheckCircle2, Loader2, Send } from 'lucide-react'
import { settingsService, type MailSettings } from '@/services/settings.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'

const MAILER_OPTIONS = [
  { value: 'smtp',     label: 'SMTP — Servidor externo (recomendado para produção)' },
  { value: 'log',      label: 'Log — Apenas registra em logs (desenvolvimento)' },
  { value: 'sendmail', label: 'Sendmail — Servidor local' },
]

const ENCRYPTION_OPTIONS = [
  { value: '',    label: 'Nenhuma' },
  { value: 'tls', label: 'TLS (porta 587)' },
  { value: 'ssl', label: 'SSL (porta 465)' },
]

export default function Settings() {
  const [form, setForm]         = useState<MailSettings>({
    mail_from_name: '',
    mail_from_address: '',
    mail_mailer: 'smtp',
    mail_host: '',
    mail_port: '',
    mail_username: '',
    mail_password: '',
    mail_encryption: 'tls',
  })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    settingsService.get().then(res => {
      // Normaliza null → '' para evitar warnings de controlled inputs
      const normalized = Object.fromEntries(
        Object.entries(res.data.data).map(([k, v]) => [k, v ?? ''])
      ) as typeof res.data.data
      setForm(f => ({ ...f, ...normalized }))
    }).catch(() => {
      setError('Erro ao carregar configurações.')
    }).finally(() => setLoading(false))
  }, [])

  const set = (key: keyof MailSettings, value: string) =>
    setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await settingsService.update(form)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: any) {
      const errs = err.response?.data?.errors
      if (errs) {
        setError(Object.values(errs).flat().join(' · '))
      } else {
        setError(err.response?.data?.message ?? 'Erro ao salvar.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 size={28} className="animate-spin text-[#1B2E4B]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B2E4B]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Configurações
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">Personalize o comportamento do sistema</p>
      </div>

      {error   && <Alert variant="error"   className="mb-4">{error}</Alert>}
      {success && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Alert variant="success">Configurações salvas com sucesso! Os próximos e-mails já usarão as novas definições.</Alert>
        </motion.div>
      )}

      {/* ── E-mail Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm overflow-hidden mb-6"
      >
        <div className="px-6 py-4 border-b border-[#E2DDD5] bg-[#FDFCF9] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1B2E4B]/10 flex items-center justify-center">
            <Mail size={16} className="text-[#1B2E4B]" />
          </div>
          <div>
            <h2 className="font-semibold text-[#1B2E4B] text-sm">Configurações de E-mail</h2>
            <p className="text-xs text-[#6B7280]">Remetente e servidor SMTP para notificações</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Identidade do remetente */}
          <div>
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Send size={11} /> Identidade do Remetente
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome do Remetente"
                value={form.mail_from_name}
                onChange={e => set('mail_from_name', e.target.value)}
                placeholder="Assinatura Jurídica"
              />
              <Input
                label="E-mail do Remetente"
                type="email"
                value={form.mail_from_address}
                onChange={e => set('mail_from_address', e.target.value)}
                placeholder="assinatura@escritorio.com.br"
              />
            </div>
          </div>

          {/* Driver */}
          <div>
            <label className="text-sm font-medium text-[#1A1A2E] mb-1.5 block">Driver de Envio</label>
            <div className="space-y-2">
              {MAILER_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={[
                    'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                    form.mail_mailer === opt.value
                      ? 'border-[#1B2E4B] bg-[#1B2E4B]/5'
                      : 'border-[#E2DDD5] hover:border-[#C9A84C]/40',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="mail_mailer"
                    value={opt.value}
                    checked={form.mail_mailer === opt.value}
                    onChange={() => set('mail_mailer', opt.value)}
                    className="mt-0.5 accent-[#1B2E4B]"
                  />
                  <span className="text-sm text-[#1B2E4B]">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* SMTP details */}
          {form.mail_mailer === 'smtp' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider flex items-center gap-2">
                <Server size={11} /> Servidor SMTP
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Host SMTP"
                    value={form.mail_host}
                    onChange={e => set('mail_host', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <Input
                  label="Porta"
                  value={form.mail_port}
                  onChange={e => set('mail_port', e.target.value)}
                  placeholder="587"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Usuário (e-mail)"
                  value={form.mail_username}
                  onChange={e => set('mail_username', e.target.value)}
                  placeholder="usuario@gmail.com"
                />
                <div>
                  <label className="text-sm font-medium text-[#1A1A2E] mb-1.5 block flex items-center gap-1">
                    <Lock size={12} /> Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.mail_password}
                      onChange={e => set('mail_password', e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-md text-sm border border-[#E2DDD5] bg-white focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1B2E4B]"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-xs text-[#9CA3AF] mt-1">Deixe em branco para manter a senha atual</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#1A1A2E] mb-1.5 block">Criptografia</label>
                <select
                  value={form.mail_encryption}
                  onChange={e => set('mail_encryption', e.target.value as 'tls' | 'ssl' | '')}
                  className="px-3.5 py-2.5 rounded-md text-sm border border-[#E2DDD5] bg-white focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                >
                  {ENCRYPTION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Preview box */}
              <div className="bg-[#F8F7F4] border border-[#E2DDD5] rounded-xl p-4">
                <p className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wider">Pré-visualização</p>
                <p className="text-sm text-[#374151]">
                  Os e-mails serão enviados como{' '}
                  <strong className="text-[#1B2E4B]">{form.mail_from_name || '—'}</strong>{' '}
                  &lt;<span className="text-[#0F7A5A] font-mono text-xs">{form.mail_from_address || '—'}</span>&gt;
                  {form.mail_host && (
                    <> via <span className="font-mono text-xs">{form.mail_host}:{form.mail_port}</span></>
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E2DDD5] bg-[#FDFCF9] flex justify-end">
          <Button
            loading={saving}
            onClick={handleSave}
            icon={success ? <CheckCircle2 size={15} /> : <Save size={15} />}
          >
            {success ? 'Salvo!' : 'Salvar Configurações'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
