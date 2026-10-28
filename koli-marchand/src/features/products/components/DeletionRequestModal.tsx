import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/FormField'
import { useRequestProductDeletion } from '../api/useProducts'
import type { Product } from '@/types'

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  return message ?? fallback
}

interface DeletionRequestModalProps {
  product: Product
  onClose: () => void
}

// Un marchand ne peut jamais supprimer directement un produit — ce modal
// envoie une demande que seul l'admin Skignas peut approuver ou refuser
// (voir POST /api/seller/products/:id/deletion-request).
export function DeletionRequestModal({ product, onClose }: DeletionRequestModalProps) {
  const [reason, setReason] = useState('')
  const requestDeletion = useRequestProductDeletion()

  const handleSubmit = () => {
    requestDeletion.mutate({ id: product.id, reason: reason.trim() || undefined }, { onSuccess: onClose })
  }

  return (
    <Modal title="Demander la suppression" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[#6b6b68]">
          Vous ne pouvez pas supprimer <span className="font-semibold text-[#0a0a0b]">{product.name}</span> vous-même.
          Votre demande sera envoyée à l&apos;administration Skignas, qui l&apos;approuvera ou la refusera.
        </p>
        <TextAreaField
          label="Motif (optionnel)"
          id="deletion-reason"
          rows={3}
          placeholder="Ex : doublon, arrêt de la référence fournisseur..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
        {requestDeletion.isError && (
          <p className="text-xs text-rose-600">{errorMessage(requestDeletion.error, 'Échec de l’envoi de la demande, réessayez.')}</p>
        )}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button variant="danger" isLoading={requestDeletion.isPending} onClick={handleSubmit}>
            Envoyer la demande
          </Button>
        </div>
      </div>
    </Modal>
  )
}
