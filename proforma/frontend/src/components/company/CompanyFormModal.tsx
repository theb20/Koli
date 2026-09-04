import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Field'
import { Button } from '../ui/Button'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import type { Company } from '../../types'

const EMPTY = { name: '', address: '', phone: '', email: '', website: '', taxId: '', rccm: '', legalInfo: '' }

export function CompanyFormModal({ open, onClose, company }: { open: boolean; onClose: () => void; company?: Company }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const addCompany = useAuthStore((s) => s.addCompany)
  const updateCompany = useAuthStore((s) => s.updateCompany)
  const pushToast = useUiStore((s) => s.pushToast)

  useEffect(() => {
    if (open) {
      setForm(
        company
          ? {
              name: company.name,
              address: company.address || '',
              phone: company.phone || '',
              email: company.email || '',
              website: company.website || '',
              taxId: company.taxId || '',
              rccm: company.rccm || '',
              legalInfo: company.legalInfo || '',
            }
          : EMPTY
      )
      setError('')
    }
  }, [open, company])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Le nom est requis')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (company) {
        const res = await api.put<{ company: Company }>(`/api/companies/${company.id}`, form)
        updateCompany(res.company)
        pushToast('Entreprise mise à jour', 'success')
      } else {
        const res = await api.post<{ company: Company }>('/api/companies', form)
        addCompany(res.company)
        pushToast('Entreprise créée', 'success')
      }
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={company ? "Modifier l'entreprise" : 'Nouvelle entreprise'} width="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Nom de l'entreprise" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Textarea label="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <Input label="Site internet" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Numéro fiscal (NIF)" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
          <Input label="RCCM" value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} />
        </div>
        <Textarea label="Autres informations légales" value={form.legalInfo} onChange={(e) => setForm({ ...form, legalInfo: e.target.value })} />
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            {company ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
