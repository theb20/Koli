import { useState } from 'react'
import { CheckCircle2, AlertTriangle, Image as ImageIcon } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { fmtDateTime, fmtFcfa } from '@/lib/format'
import { returnStatusMap, returnReasonLabels } from '@/lib/statusMaps'
import type { MerchantReturn } from '@/types'
import { useCommentReturn } from '../api/useReturns'

interface ReturnDetailDrawerProps {
  ret: MerchantReturn
  onClose: () => void
}

export function ReturnDetailDrawer({ ret, onClose }: ReturnDetailDrawerProps) {
  const commentMut = useCommentReturn()
  const [damaged, setDamaged] = useState<boolean | null>(ret.merchantDamaged)
  const [comment, setComment] = useState(ret.merchantComment ?? '')

  const total = ret.items.reduce((s, it) => s + it.price * it.quantity, 0)
  const alreadyCommented = !!ret.merchantCommentedAt

  return (
    <Drawer title={ret.orderNumber} onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <StatusBadge label={returnStatusMap[ret.status].label} tone={returnStatusMap[ret.status].tone} />
          <p className="text-xs text-[#6b6b68]">{fmtDateTime(ret.requestedAt)}</p>
        </div>

        <section>
          <h3 className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider mb-2">Articles retournés</h3>
          <ul className="space-y-2">
            {ret.items.map((it, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-[#0a0a0b]">{it.name} × {it.quantity}</span>
                <span className="font-semibold">{fmtFcfa(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between pt-3 mt-3 border-t border-[#e8e8e4]">
            <span className="text-sm font-semibold">Total (vos articles)</span>
            <span className="text-sm font-bold">{fmtFcfa(total)}</span>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider mb-2">Motif du client</h3>
          <p className="text-sm text-[#0a0a0b]">{returnReasonLabels[ret.reason]}</p>
          {ret.customerComment && <p className="text-sm text-[#6b6b68] mt-1.5 whitespace-pre-line">{ret.customerComment}</p>}
        </section>

        {ret.photos.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ImageIcon size={13} /> Photos du client
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {ret.photos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="aspect-square rounded-lg overflow-hidden bg-[#f5f5f3] border border-[#e8e8e4]">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </section>
        )}

        {ret.status === 'refunded' && (
          <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-emerald-800">Remboursé par Skignas</p>
            {ret.refundedAt && <p className="text-xs text-emerald-700 mt-1">{fmtDateTime(ret.refundedAt)}</p>}
            {ret.proofUrl && (
              <a href={ret.proofUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block w-20">
                <img src={ret.proofUrl} alt="Preuve du remboursement" className="w-full aspect-square object-cover rounded-lg border border-emerald-200" />
              </a>
            )}
          </section>
        )}

        <section className="border-t border-[#e8e8e4] pt-5">
          <h3 className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider mb-3">
            Votre constat {alreadyCommented && '(modifiable)'}
          </h3>
          <p className="text-xs text-[#6b6b68] mb-3">
            Informatif uniquement — vous ne pilotez pas le traitement de ce retour, seulement
            l'état du produit que vous avez constaté.
          </p>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setDamaged(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                damaged === false
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-[#e8e8e4] text-[#6b6b68] hover:border-[#1E90FF]'
              }`}
            >
              <CheckCircle2 size={14} /> Non endommagé
            </button>
            <button
              onClick={() => setDamaged(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                damaged === true
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : 'border-[#e8e8e4] text-[#6b6b68] hover:border-[#1E90FF]'
              }`}
            >
              <AlertTriangle size={14} /> Endommagé
            </button>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Détails sur l'état du produit à la réception (optionnel)"
            className="w-full rounded-xl border border-[#e8e8e4] px-3 py-2.5 text-sm focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20 transition-colors"
          />
          <button
            onClick={() => damaged !== null && commentMut.mutate({ id: ret.id, damaged, comment: comment || undefined })}
            disabled={damaged === null || commentMut.isPending}
            className="mt-3 w-full rounded-xl bg-[#0a0a0b] text-white text-sm font-semibold py-2.5 disabled:opacity-40 transition-opacity"
          >
            {commentMut.isPending ? 'Envoi…' : alreadyCommented ? 'Mettre à jour mon constat' : 'Envoyer mon constat'}
          </button>
          {ret.merchantCommentedAt && (
            <p className="text-xs text-[#a3a3a1] mt-2">Dernier constat : {fmtDateTime(ret.merchantCommentedAt)}</p>
          )}
        </section>
      </div>
    </Drawer>
  )
}
