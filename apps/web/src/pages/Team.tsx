import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, Search, Pencil, Trash2, KeyRound,
  Scale, Crown, Mail, Phone, Hash, Calendar,
  Loader2, AlertTriangle
} from 'lucide-react'
import { teamService, type TeamMember } from '@/services/team.service'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'

// ─── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#1B2E4B', '#C9A84C'],
  ['#0F7A5A', '#D1FAE5'],
  ['#7C3AED', '#EDE9FE'],
  ['#B45309', '#FEF3C7'],
  ['#1D4ED8', '#DBEAFE'],
  ['#9D174D', '#FCE7F3'],
]

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  const [bg, fg] = AVATAR_COLORS[idx]
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const sz = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div
      className={`${sz} rounded-xl flex items-center justify-center font-bold shrink-0 select-none`}
      style={{ background: bg, color: fg }}
    >
      {initials}
    </div>
  )
}

// ─── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: 'admin' | 'lawyer' }) {
  return role === 'admin' ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#C9A84C]/15 text-[#92700A] px-2 py-0.5 rounded-full border border-[#C9A84C]/30">
      <Crown size={10} /> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#1B2E4B]/10 text-[#1B2E4B] px-2 py-0.5 rounded-full border border-[#1B2E4B]/15">
      <Scale size={10} /> Advogado
    </span>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-[#F0EDE8] flex items-center justify-center mb-5">
        <Users size={36} className="text-[#C9A84C]" />
      </div>
      <h3 className="text-lg font-semibold text-[#1B2E4B] mb-2">Nenhum membro encontrado</h3>
      <p className="text-sm text-[#6B7280] mb-6 max-w-xs">
        Adicione advogados e administradores ao sistema para colaborarem nas assinaturas.
      </p>
      <Button icon={<UserPlus size={15} />} onClick={onInvite}>Convidar Membro</Button>
    </motion.div>
  )
}

// ─── Member Card ───────────────────────────────────────────────────────────────
function MemberCard({
  member, index, currentUserId, isAdmin,
  onEdit, onDelete, onResetPassword,
}: {
  member: TeamMember
  index: number
  currentUserId: number
  isAdmin: boolean
  onEdit: (m: TeamMember) => void
  onDelete: (m: TeamMember) => void
  onResetPassword: (m: TeamMember) => void
}) {
  const isSelf = member.id === currentUserId
  const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, ease: 'easeOut' }}
      className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm hover:shadow-md hover:border-[#C9A84C]/40 transition-all duration-200 p-5 flex flex-col gap-4"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={member.name} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-[#1B2E4B] truncate">{member.name}</p>
              {isSelf && (
                <span className="text-[10px] font-bold text-[#0F7A5A] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  Você
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280] truncate">{member.email}</p>
          </div>
        </div>
        <RoleBadge role={member.role} />
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 gap-1.5 text-xs text-[#6B7280]">
        {member.oab_number && (
          <div className="flex items-center gap-1.5">
            <Hash size={11} className="shrink-0" />
            <span>OAB {member.oab_number}</span>
          </div>
        )}
        {member.phone && (
          <div className="flex items-center gap-1.5">
            <Phone size={11} className="shrink-0" />
            <span>{member.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className="shrink-0" />
          <span>Desde {fmt(member.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      {isAdmin && (
        <div className="flex items-center gap-1.5 pt-3 border-t border-[#F0EDE8]">
          <button
            onClick={() => onEdit(member)}
            className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#1B2E4B] hover:bg-[#F0EDE8] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Pencil size={12} /> Editar
          </button>
          <button
            onClick={() => onResetPassword(member)}
            className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#1B2E4B] hover:bg-[#F0EDE8] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <KeyRound size={12} /> Redefinir Senha
          </button>
          {!isSelf && (
            <button
              onClick={() => onDelete(member)}
              className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors ml-auto"
            >
              <Trash2 size={12} /> Remover
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Team() {
  const currentUser   = useAuthStore(s => s.user)
  const isAdmin       = currentUser?.role === 'admin'

  const [members, setMembers]       = useState<TeamMember[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState<string | null>(null)

  // Modals
  const [showInvite, setShowInvite]   = useState(false)
  const [editing, setEditing]         = useState<TeamMember | null>(null)
  const [deleting, setDeleting]       = useState<TeamMember | null>(null)
  const [resetting, setResetting]     = useState<TeamMember | null>(null)

  // Form state
  const [fName, setFName]       = useState('')
  const [fEmail, setFEmail]     = useState('')
  const [fRole, setFRole]       = useState<'admin' | 'lawyer'>('lawyer')
  const [fOab, setFOab]         = useState('')
  const [fPhone, setFPhone]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await teamService.list({ search: search || undefined })
      setMembers(res.data.data)
    } catch {
      setError('Erro ao carregar membros. Apenas administradores têm acesso.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const openInvite = () => {
    setFName(''); setFEmail(''); setFRole('lawyer'); setFOab(''); setFPhone('')
    setFormError(null)
    setShowInvite(true)
  }

  const openEdit = (m: TeamMember) => {
    setEditing(m)
    setFName(m.name); setFRole(m.role); setFOab(m.oab_number ?? ''); setFPhone(m.phone ?? '')
    setFormError(null)
  }

  const handleInvite = async () => {
    if (!fName || !fEmail) { setFormError('Nome e e-mail são obrigatórios.'); return }
    setSaving(true); setFormError(null)
    try {
      await teamService.create({ name: fName, email: fEmail, role: fRole, oab_number: fOab || undefined, phone: fPhone || undefined })
      setShowInvite(false)
      setSuccess('Convite enviado! O membro receberá as credenciais por e-mail.')
      load()
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? err.response?.data?.errors?.email?.[0] ?? 'Erro ao convidar.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editing || !fName) { setFormError('Nome é obrigatório.'); return }
    setSaving(true); setFormError(null)
    try {
      await teamService.update(editing.id, { name: fName, role: fRole, oab_number: fOab || undefined, phone: fPhone || undefined })
      setEditing(null)
      setSuccess('Membro atualizado com sucesso.')
      load()
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Erro ao atualizar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await teamService.remove(deleting.id)
      setDeleting(null)
      setSuccess(`${deleting.name} foi removido da equipe.`)
      load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao remover.')
    }
  }

  const handleResetPassword = async () => {
    if (!resetting) return
    try {
      await teamService.resetPassword(resetting.id)
      setResetting(null)
      setSuccess(`Nova senha enviada para ${resetting.email}.`)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao redefinir senha.')
    }
  }

  // Stats
  const admins  = members.filter(m => m.role === 'admin').length
  const lawyers = members.filter(m => m.role === 'lawyer').length

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2E4B]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Equipe
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">Gerencie os membros com acesso ao sistema</p>
        </div>
        {isAdmin && (
          <Button icon={<UserPlus size={15} />} onClick={openInvite}>
            Convidar Membro
          </Button>
        )}
      </div>

      {/* ── Alerts ── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4">
            <Alert variant="error">{error}</Alert>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4">
            <Alert variant="success">{success}</Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {!isAdmin && (
        <Alert variant="warning" className="mb-6" title="Acesso restrito">
          Apenas administradores podem gerenciar membros da equipe.
        </Alert>
      )}

      {/* ── Stats bar ── */}
      {!loading && members.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          {[
            { label: 'Total', value: members.length, icon: <Users size={16} />, color: 'text-[#1B2E4B]', bg: 'bg-[#F0EDE8]' },
            { label: 'Advogados', value: lawyers, icon: <Scale size={16} />, color: 'text-[#1B2E4B]', bg: 'bg-[#F0EDE8]' },
            { label: 'Admins', value: admins, icon: <Crown size={16} />, color: 'text-[#92700A]', bg: 'bg-[#C9A84C]/10' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-[#E2DDD5] px-5 py-4 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1B2E4B] leading-none">{stat.value}</p>
                <p className="text-xs text-[#6B7280] mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Search ── */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm p-4 mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou OAB..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#E2DDD5] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] bg-white"
          />
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-[#1B2E4B]" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState onInvite={openInvite} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m, i) => (
            <MemberCard
              key={m.id}
              member={m}
              index={i}
              currentUserId={currentUser?.id ?? 0}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onDelete={setDeleting}
              onResetPassword={setResetting}
            />
          ))}
        </div>
      )}

      {/* ── Modal: Convidar ── */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Convidar Membro">
        <div className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input label="Nome Completo" value={fName} onChange={e => setFName(e.target.value)} required />
          <Input label="E-mail" type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} required />

          <div>
            <label className="text-sm font-medium text-[#1A1A2E] mb-1.5 block">Perfil de Acesso</label>
            <div className="grid grid-cols-2 gap-3">
              {(['lawyer', 'admin'] as const).map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFRole(role)}
                  className={[
                    'flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all',
                    fRole === role
                      ? 'border-[#1B2E4B] bg-[#1B2E4B]/5'
                      : 'border-[#E2DDD5] hover:border-[#C9A84C]/50',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    {role === 'admin' ? <Crown size={15} className="text-[#C9A84C]" /> : <Scale size={15} className="text-[#1B2E4B]" />}
                    <span className="text-sm font-semibold text-[#1B2E4B]">
                      {role === 'admin' ? 'Administrador' : 'Advogado'}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] leading-relaxed">
                    {role === 'admin'
                      ? 'Acesso total, gerencia equipe e documentos.'
                      : 'Cria documentos, assina com certificado A1.'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Nº OAB" value={fOab} onChange={e => setFOab(e.target.value)} placeholder="SP 123456" />
            <Input label="Telefone" value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>

          <Alert variant="info">
            As credenciais de acesso serão enviadas automaticamente para o e-mail informado.
          </Alert>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancelar</Button>
            <Button loading={saving} onClick={handleInvite} icon={<Mail size={15} />}>
              Enviar Convite
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Editar ── */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar Membro">
        <div className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          {editing && (
            <div className="flex items-center gap-3 p-3 bg-[#F8F7F4] rounded-xl border border-[#E2DDD5]">
              <Avatar name={editing.name} size="sm" />
              <div>
                <p className="text-sm font-medium text-[#1B2E4B]">{editing.name}</p>
                <p className="text-xs text-[#6B7280]">{editing.email}</p>
              </div>
            </div>
          )}

          <Input label="Nome Completo" value={fName} onChange={e => setFName(e.target.value)} required />

          <div>
            <label className="text-sm font-medium text-[#1A1A2E] mb-1.5 block">Perfil de Acesso</label>
            <div className="grid grid-cols-2 gap-3">
              {(['lawyer', 'admin'] as const).map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFRole(role)}
                  className={[
                    'flex items-center gap-2 p-3 rounded-xl border-2 transition-all',
                    fRole === role
                      ? 'border-[#1B2E4B] bg-[#1B2E4B]/5'
                      : 'border-[#E2DDD5] hover:border-[#C9A84C]/50',
                  ].join(' ')}
                >
                  {role === 'admin' ? <Crown size={14} className="text-[#C9A84C]" /> : <Scale size={14} className="text-[#1B2E4B]" />}
                  <span className="text-sm font-medium text-[#1B2E4B]">
                    {role === 'admin' ? 'Admin' : 'Advogado'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Nº OAB" value={fOab} onChange={e => setFOab(e.target.value)} placeholder="SP 123456" />
            <Input label="Telefone" value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button loading={saving} onClick={handleUpdate}>Salvar Alterações</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Deletar ── */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Remover Membro" maxWidth="sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm text-[#374151] leading-relaxed">
              Tem certeza que deseja remover <strong>{deleting?.name}</strong> da equipe?
              Todos os tokens de acesso serão invalidados imediatamente.
            </p>
            <p className="text-xs text-[#9CA3AF] mt-2">
              Documentos e clientes vinculados a este usuário não serão afetados.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>Remover Membro</Button>
        </div>
      </Modal>

      {/* ── Modal: Redefinir Senha ── */}
      <Modal open={!!resetting} onClose={() => setResetting(null)} title="Redefinir Senha" maxWidth="sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
            <KeyRound size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-[#374151] leading-relaxed">
              Uma nova senha temporária será gerada e enviada para <strong>{resetting?.email}</strong>.
            </p>
            <p className="text-xs text-[#9CA3AF] mt-2">
              Todas as sessões ativas do usuário serão encerradas.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setResetting(null)}>Cancelar</Button>
          <Button size="sm" icon={<KeyRound size={14} />} onClick={handleResetPassword}>
            Gerar e Enviar Nova Senha
          </Button>
        </div>
      </Modal>
    </div>
  )
}
