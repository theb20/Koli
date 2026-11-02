import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useSiteSettings } from '../../hooks/useSiteSettings'

export function ImportantInfo() {
  const [open, setOpen] = useState(true)
  const settings = useSiteSettings()

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-2xl font-bold text-ink">Informations importantes</h2>
        {open ? <ChevronUp size={20} className="text-muted" /> : <ChevronDown size={20} className="text-muted" />}
      </button>

      {open && (
        <div className="mt-5 space-y-6 text-sm text-muted leading-relaxed">
          <div>
            <p className="font-semibold text-ink mb-2 uppercase text-xs tracking-wide">Avertissement de sécurité</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Vérifiez l'intégrité de l'emballage à la réception.</li>
              <li>Tenez hors de portée des enfants si le produit comporte de petites pièces.</li>
              <li>Respectez les consignes d'usage indiquées sur l'emballage ou la notice du fabricant.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-ink mb-2 uppercase text-xs tracking-wide">Informations sur le vendeur</p>
            <p>Skignas SAS — {settings.address}</p>
            <p>Contact : <a href={`mailto:${settings.supportEmail}`} className="underline underline-offset-2 hover:text-ink">{settings.supportEmail}</a></p>
          </div>
        </div>
      )}
    </div>
  )
}
