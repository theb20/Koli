import { useState } from 'react'
import { Plus } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Field'
import { Button } from '../ui/Button'
import { api } from '../../lib/api'
import type { Client } from '../../types'

export function ClientPicker({
  clients,
  value,
  onChange,
  onClientCreated,
  companyId,
}: {
  clients: Client[]
  value: string
  onChange: (clientId: string) => void
  onClientCreated: (client: Client) => void
  companyId: string
}) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 flex-1 border border-border bg-white px-3 text-sm">
        <option value="">Sélectionner un client…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <Button type="button" variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
        Nouveau
      </Button>

      <QuickCreateClientModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        companyId={companyId}
        onCreated={(c) => {
          onClientCreated(c)
          onChange(c.id)
          setCreateOpen(false)
        }}
      />
    </div>
  )
}

function QuickCreateClientModal({
  open,
  onClose,
  companyId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  companyId: string
  onCreated: (client: Client) => void
}) {
  const [form, setForm] = useState({ name: '', contactName: '', email: '', phone: '', address: '', country: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Le nom est requis')
    setLoading(true)
    setError('')
    try {
      const res = await api.post<{ client: Client }>(`/api/companies/${companyId}/clients`, form)
      onCreated(res.client)
      setForm({ name: '', contactName: '', email: '', phone: '', address: '', country: '' })
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau client">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Nom / Entreprise" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Personne de contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <Textarea label="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <Input label="Pays" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Créer le client
          </Button>
        </div>
      </form>
    </Modal>
  )
}
