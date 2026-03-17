import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { clientsService } from '@/services/clients.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import type { Client } from '@/types'

export default function Clients() {
  const [clients, setClients]       = useState<Client[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<Client | null>(null)
  const [deleting, setDeleting]     = useState<Client | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)

  // Form state
  const [formName, setFormName]         = useState('')
  const [formCpf, setFormCpf]           = useState('')
  const [formEmail, setFormEmail]       = useState('')
  const [formWhatsapp, setFormWhatsapp] = useState('')

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await clientsService.list({ search: search || undefined })
      setClients((res.data as any).data ?? [])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { loadClients() }, [loadClients])

  const openNew = () => {
    setEditing(null)
    setFormName(''); setFormCpf(''); setFormEmail(''); setFormWhatsapp('')
    setShowModal(true)
    setError(null)
  }

  const openEdit = (c: Client) => {
    setEditing(c)
    setFormName(c.name); setFormCpf(c.cpf); setFormEmail(c.email); setFormWhatsapp(c.whatsapp ?? '')
    setShowModal(true)
    setError(null)
  }

  const handleSave = async () => {
    if (!formName || !formCpf || !formEmail) {
      setError('Preencha os campos obrigatórios.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const data = { name: formName, cpf: formCpf, email: formEmail, whatsapp: formWhatsapp || null }
      if (editing) {
        await clientsService.update(editing.id, data)
      } else {
        await clientsService.create(data)
      }
      setShowModal(false)
      loadClients()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await clientsService.delete(deleting.id)
      setDeleting(null)
      loadClients()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao excluir.')
    }
  }


  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2E4B]" style={{ fontFamily: "'Playfair Display', serif" }}>Clientes</h1>
          <p className="text-sm text-[#6B7280] mt-1">Gerencie os clientes do escritório</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openNew}>Novo Cliente</Button>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm p-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#E2DDD5] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] bg-white"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#6B7280]">Carregando...</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="text-[#E2DDD5] mx-auto mb-4" />
            <p className="text-[#6B7280] font-medium mb-1">Nenhum cliente encontrado</p>
            <p className="text-sm text-[#9CA3AF]">{search ? 'Tente outra busca.' : 'Cadastre seu primeiro cliente.'}</p>
            {!search && <Button variant="ghost" size="sm" className="mt-3" onClick={openNew}>Cadastrar cliente</Button>}
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#E2DDD5] bg-[#FDFCF9] text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
              <div className="col-span-3">Nome</div>
              <div className="col-span-2">CPF</div>
              <div className="col-span-3">E-mail</div>
              <div className="col-span-2">WhatsApp</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>
            <div className="divide-y divide-[#E2DDD5]">
              {clients.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-[#FDFCF9] transition-colors items-center"
                >
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#F0EDE8] rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-[#1B2E4B]">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-[#1B2E4B] truncate">{c.name}</span>
                  </div>
                  <div className="col-span-2 text-sm text-[#374151]">{c.cpf}</div>
                  <div className="col-span-3 text-sm text-[#374151] truncate">{c.email}</div>
                  <div className="col-span-2 text-sm text-[#6B7280]">{c.whatsapp || '—'}</div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-[#6B7280] hover:bg-[#F0EDE8] hover:text-[#1B2E4B] transition-colors" title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleting(c)} className="p-1.5 rounded-md text-[#6B7280] hover:bg-red-50 hover:text-red-600 transition-colors" title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de criação/edição */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Cliente' : 'Novo Cliente'}>
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input label="Nome Completo" value={formName} onChange={e => setFormName(e.target.value)} required />
          <Input label="CPF" value={formCpf} onChange={e => setFormCpf(e.target.value)} placeholder="000.000.000-00" required disabled={!!editing} />
          <Input label="E-mail" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} required />
          <Input label="WhatsApp" value={formWhatsapp} onChange={e => setFormWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button loading={saving} onClick={handleSave}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal de exclusão */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Excluir Cliente" maxWidth="sm">
        <p className="text-sm text-[#374151] mb-4">
          Tem certeza que deseja excluir <strong>{deleting?.name}</strong>? Documentos vinculados não serão afetados.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
