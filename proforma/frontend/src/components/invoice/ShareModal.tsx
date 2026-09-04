import { useState } from 'react'
import { Link2, Mail, MessageCircle, Download, Check } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { pdfUrl } from '../../lib/api'

export function ShareModal({ open, onClose, publicToken, number, id }: { open: boolean; onClose: () => void; publicToken: string; number: string; id: string }) {
  const [copied, setCopied] = useState(false)
  const publicUrl = `${window.location.origin}/p/${publicToken}`

  function copyLink() {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal open={open} onClose={onClose} title="Partager la proforma">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 border border-border bg-gray-50 px-3 py-2 text-xs text-muted">
          <span className="truncate">{publicUrl}</span>
        </div>

        <button onClick={copyLink} className="flex items-center gap-3 border border-border px-4 py-3 text-left text-sm font-medium hover:bg-gray-50">
          {copied ? <Check size={16} className="text-emerald-600" /> : <Link2 size={16} className="text-brand" />}
          {copied ? 'Lien copié !' : 'Copier le lien'}
        </button>

        <a
          href={`mailto:?subject=${encodeURIComponent(`Facture proforma ${number}`)}&body=${encodeURIComponent(`Bonjour,\n\nVoici le lien vers la facture proforma ${number} :\n${publicUrl}`)}`}
          className="flex items-center gap-3 border border-border px-4 py-3 text-left text-sm font-medium hover:bg-gray-50"
        >
          <Mail size={16} className="text-brand" /> Envoyer par email
        </a>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Facture proforma ${number} : ${publicUrl}`)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 border border-border px-4 py-3 text-left text-sm font-medium hover:bg-gray-50"
        >
          <MessageCircle size={16} className="text-brand" /> Partager sur WhatsApp
        </a>

        <a href={pdfUrl('proformas', id)} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-border px-4 py-3 text-left text-sm font-medium hover:bg-gray-50">
          <Download size={16} className="text-brand" /> Télécharger le PDF
        </a>
      </div>
    </Modal>
  )
}
