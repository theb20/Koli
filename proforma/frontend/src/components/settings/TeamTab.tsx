import { useEffect, useState } from 'react'
import { UserPlus, Trash2, Shield } from '../ui/Icon'
import { api } from '../../lib/api'
import { useUiStore } from '../../store/uiStore'
import { Button } from '../ui/Button'
import { Input, Select } from '../ui/Field'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import type { Member, Role } from '../../types'

const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Administrateur', COMMERCIAL: 'Commercial', COMPTABLE: 'Comptable' }
const ROLE_DESC: Record<Role, string> = {
  ADMIN: 'Accès complet : entreprise, équipe, paramètres',
  COMMERCIAL: 'Crée et gère proformas, clients, produits',
  COMPTABLE: "Lecture seule + export comptable + encaissements",
}

export function TeamTab({ companyId, myRole }: { companyId: string; myRole?: Role }) {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('COMMERCIAL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null)
  const pushToast = useUiStore((s) => s.pushToast)
  const isAdmin = myRole === 'ADMIN'

  async function load() {
    const res = await api.get<{ members: Member[] }>(`/api/companies/${companyId}/members`)
    setMembers(res.members)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post(`/api/companies/${companyId}/members`, { email, role })
      pushToast('Membre ajouté', 'success')
      setEmail('')
      load()
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  async function changeRole(member: Member, newRole: Role) {
    try {
      await api.put(`/api/companies/${companyId}/members/${member.id}`, { role: newRole })
      load()
    } catch (err: any) {
      pushToast(err.message, 'error')
    }
  }

  async function remove() {
    if (!confirmRemove) return
    try {
      await api.delete(`/api/companies/${companyId}/members/${confirmRemove.id}`)
      pushToast('Membre retiré', 'success')
      setConfirmRemove(null)
      load()
    } catch (err: any) {
      pushToast(err.message, 'error')
      setConfirmRemove(null)
    }
  }

  return (
    <div className="max-w-2xl border border-border bg-white p-5">
      <p className="mb-1 text-sm font-bold text-ink">Équipe</p>
      <p className="mb-4 text-xs text-muted">Chaque membre doit déjà posséder un compte Proforma pour pouvoir être ajouté.</p>

      {isAdmin && (
        <form onSubmit={invite} className="mb-5 flex items-end gap-2 border border-border bg-gray-50 p-3">
          <div className="flex-1">
            <Input label="Email du membre" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Select label="Rôle" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="COMMERCIAL">Commercial</option>
            <option value="COMPTABLE">Comptable</option>
            <option value="ADMIN">Administrateur</option>
          </Select>
          <Button type="submit" size="md" icon={<UserPlus size={14} />} loading={loading}>
            Ajouter
          </Button>
        </form>
      )}
      {error && <p className="mb-3 text-xs font-medium text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        {members?.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border border-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center bg-brand-light text-xs font-bold text-brand-dark">
              {m.user.firstName[0]}
              {m.user.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {m.user.firstName} {m.user.lastName}
              </p>
              <p className="truncate text-xs text-muted">{m.user.email}</p>
            </div>
            {isAdmin ? (
              <select
                value={m.role}
                onChange={(e) => changeRole(m, e.target.value as Role)}
                className="h-8 border border-border bg-white px-2 text-xs"
              >
                <option value="ADMIN">Administrateur</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="COMPTABLE">Comptable</option>
              </select>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                <Shield size={12} /> {ROLE_LABEL[m.role]}
              </span>
            )}
            {isAdmin && (
              <button onClick={() => setConfirmRemove(m)} className="p-1.5 text-muted hover:bg-red-50 hover:text-danger">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-1.5 bg-gray-50 p-3 text-[11px] text-muted">
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <p key={r}>
            <strong>{ROLE_LABEL[r]}</strong> — {ROLE_DESC[r]}
          </p>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        title="Retirer ce membre"
        message={`Retirer ${confirmRemove?.user.firstName} ${confirmRemove?.user.lastName} de l'entreprise ?`}
        confirmLabel="Retirer"
        danger
        onConfirm={remove}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  )
}
