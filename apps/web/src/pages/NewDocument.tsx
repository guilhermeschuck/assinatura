import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, UserPlus, Users, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { documentsService } from '@/services/documents.service'
import { clientsService } from '@/services/clients.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import type { Client } from '@/types'

const schema = z.object({
  title:           z.string().min(1, 'Título obrigatório').max(255),
  expiration_days: z.coerce.number().int().min(1).max(90),
  mode:            z.enum(['existing', 'new']),
  client_id:       z.coerce.number().optional(),
  client_name:     z.string().optional(),
  client_cpf:      z.string().optional(),
  client_email:    z.string().optional(),
  client_whatsapp: z.string().optional(),
}).refine(data => {
  if (data.mode === 'existing') return !!data.client_id
  return !!data.client_name && !!data.client_cpf && !!data.client_email
}, { message: 'Preencha os dados do cliente', path: ['client_id'] })

type Form = z.infer<typeof schema>

export default function NewDocument() {
  const navigate = useNavigate()

  const [clients, setClients]   = useState<Client[]>([])
  const [pdfFile, setPdfFile]   = useState<File | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { mode: 'new', expiration_days: 7 },
  })

  const mode = watch('mode')

  useEffect(() => {
    clientsService.list({ page: 1 }).then(res => {
      setClients((res.data as any).data ?? [])
    })
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') {
      setPdfFile(file)
    }
  }, [])

  const onSubmit = async (data: Form) => {
    if (!pdfFile) {
      setError('Selecione um arquivo PDF.')
      return
    }
    setError(null)

    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('pdf_file', pdfFile)
    formData.append('expiration_days', String(data.expiration_days))

    if (data.mode === 'existing' && data.client_id) {
      formData.append('client_id', String(data.client_id))
    } else {
      formData.append('client[name]', data.client_name!)
      formData.append('client[cpf]', data.client_cpf!)
      formData.append('client[email]', data.client_email!)
      if (data.client_whatsapp) formData.append('client[whatsapp]', data.client_whatsapp)
    }

    try {
      const res = await documentsService.create(formData)
      navigate(`/documents/${(res.data as any).data.id}`)
    } catch (err: any) {
      const msg = err.response?.data?.message
      const errs = err.response?.data?.errors
      if (errs) {
        setError(Object.values(errs).flat().join(' · '))
      } else {
        setError(msg ?? 'Erro ao criar o documento.')
      }
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/documents" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1B2E4B] mb-4 transition-colors">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <h1 className="text-2xl font-bold text-[#1B2E4B] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
        Novo Documento
      </h1>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Upload PDF */}
        <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm p-6">
          <h2 className="font-semibold text-[#1B2E4B] mb-4 flex items-center gap-2"><Upload size={16} /> Documento PDF</h2>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={[
              'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
              dragOver ? 'border-[#C9A84C] bg-[#C9A84C]/5' : 'border-[#E2DDD5] hover:border-[#C9A84C]',
            ].join(' ')}
            onClick={() => document.getElementById('pdf-input')?.click()}
          >
            {pdfFile ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <FileText size={20} className="text-[#0F7A5A]" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[#1B2E4B]">{pdfFile.name}</p>
                  <p className="text-xs text-[#6B7280]">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setPdfFile(null) }} className="ml-3 p-1 rounded-md hover:bg-red-50">
                  <X size={16} className="text-red-500" />
                </button>
              </div>
            ) : (
              <>
                <Upload size={32} className="text-[#C9A84C] mx-auto mb-3" />
                <p className="font-medium text-[#1B2E4B] mb-1">Arraste um PDF aqui ou clique para selecionar</p>
                <p className="text-xs text-[#6B7280]">Máximo 20 MB · Apenas arquivos .pdf</p>
              </>
            )}
            <input
              id="pdf-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) setPdfFile(e.target.files[0]) }}
            />
          </div>
        </div>

        {/* Dados do documento */}
        <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm p-6">
          <h2 className="font-semibold text-[#1B2E4B] mb-4 flex items-center gap-2"><FileText size={16} /> Dados do Documento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Título do Documento" placeholder="Ex: Procuração ad Judicia" error={errors.title?.message} required {...register('title')} />
            </div>
            <Input label="Expiração (dias)" type="number" error={errors.expiration_days?.message} {...register('expiration_days')} />
          </div>
        </div>

        {/* Cliente */}
        <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm p-6">
          <h2 className="font-semibold text-[#1B2E4B] mb-4">Dados do Cliente</h2>

          {/* Toggle modo */}
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => setValue('mode', 'new')}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                mode === 'new' ? 'bg-[#1B2E4B] text-white' : 'bg-[#F0EDE8] text-[#6B7280]',
              ].join(' ')}
            >
              <UserPlus size={14} /> Novo Cliente
            </button>
            <button
              type="button"
              onClick={() => setValue('mode', 'existing')}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                mode === 'existing' ? 'bg-[#1B2E4B] text-white' : 'bg-[#F0EDE8] text-[#6B7280]',
              ].join(' ')}
            >
              <Users size={14} /> Cliente Existente
            </button>
          </div>

          {mode === 'existing' ? (
            <div>
              <label className="text-sm font-medium text-[#1A1A2E] mb-1.5 block">Selecione o cliente</label>
              <select
                {...register('client_id')}
                className="w-full px-3.5 py-2.5 rounded-md text-sm border border-[#E2DDD5] bg-white focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
              >
                <option value="">— Selecione —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.cpf}</option>
                ))}
              </select>
              {errors.client_id && <p className="text-xs text-red-600 mt-1">{errors.client_id.message}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Nome Completo" placeholder="Nome do cliente" error={errors.client_name?.message} required {...register('client_name')} />
              </div>
              <Input label="CPF" placeholder="000.000.000-00" error={errors.client_cpf?.message} required {...register('client_cpf')} />
              <Input label="E-mail" type="email" placeholder="cliente@email.com" error={errors.client_email?.message} required {...register('client_email')} />
              <Input label="WhatsApp (opcional)" placeholder="(11) 99999-9999" {...register('client_whatsapp')} />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link to="/documents">
            <Button variant="ghost" type="button">Cancelar</Button>
          </Link>
          <Button type="submit" size="lg" loading={isSubmitting} icon={isSubmitting ? undefined : <FileText size={16} />}>
            Criar e Enviar Link
          </Button>
        </div>
      </form>
    </div>
  )
}
