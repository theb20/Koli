import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Field'
import { Button } from '../ui/Button'
import { api } from '../../lib/api'
import { useUiStore } from '../../store/uiStore'
import type { Client } from '../../types'

const EMPTY = { name: '', contactName: '', address: '', phone: '', email: '', country: '', taxId: '', rccm: '' }

export function ClientFormModal({
  open,
  onClose,
  client,
  companyId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  client?: Client
  companyId: string
  onSaved: () => void
}) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pushToast = useUiStore((s) => s.pushToast)

  useEffect(() => {
    if (open) {
      setForm(
        client
          ? {
              name: client.name,
              contactName: client.contactName || '',
              address: client.address || '',
              phone: client.phone || '',
              email: client.email || '',
              country: client.country || '',
              taxId: client.taxId || '',
              rccm: client.rccm || '',
            }
          : EMPTY
      )
      setError('')
    }
  }, [open, client])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Le nom est requis')
    setLoading(true)
    setError('')
    try {
      if (client) {
        await api.put(`/api/clients/${client.id}`, form)
        pushToast('Client mis à jour', 'success')
      } else {
        await api.post(`/api/companies/${companyId}/clients`, form)
        pushToast('Client créé', 'success')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={client ? 'Modifier le client' : 'Nouveau client'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Nom / Entreprise" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Personne de contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <Textarea label="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Pays" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <Input label="Numéro fiscal" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
        </div>
        <Input label="RCCM" value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} />
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            {client ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
