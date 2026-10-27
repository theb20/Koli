import { useState } from 'react'
import { Info, X } from 'lucide-react'

const KEY = 'koli_marchand_notice_ca_paye_v1'
const read = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }

/** Prévient le marchand que ses chiffres peuvent baisser avec le nouveau calcul (masquable, mémorisé). */
export function RevenueNotice({ onShowDefinitions }: { onShowDefinitions: () => void }) {
  const [hidden, setHidden] = useState(read)
  if (hidden) return null
  return (
    <div role="note" className="mb-5 flex items-start gap-3 rounded-2xl border border-[#1E90FF]/25 bg-[#1E90FF]/5 px-4 py-3 text-sm text-[#0a0a0b]">
      <Info size={17} className="text-[#1E90FF] shrink-0 mt-0.5" aria-hidden />
      <p className="flex-1 leading-relaxed">
        <strong className="font-semibold">Nouveau calcul de vos chiffres.</strong> Seules les commandes <strong className="font-semibold">payées</strong> sont
        désormais comptées, remboursements déduits et datées au jour du paiement. Vos chiffres peuvent être plus bas qu'avant : l'ancien
        affichage comptait aussi des commandes confirmées mais pas encore encaissées.{' '}
        <button type="button" onClick={onShowDefinitions} className="font-semibold text-[#1E90FF] underline underline-offset-2">Voir les définitions</button>
      </p>
      <button type="button" aria-label="Masquer ce message" onClick={() => { setHidden(true); try { localStorage.setItem(KEY, '1') } catch { /* navigation privée */ } }}
        className="p-1 -m-1 rounded-lg text-[#6b6b68] hover:text-[#0a0a0b]">
        <X size={16} aria-hidden />
      </button>
    </div>
  )
}
