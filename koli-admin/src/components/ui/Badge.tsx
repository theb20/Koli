type Props = { label: string; color?: string }

const colors: Record<string, string> = {
  pending:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed:  'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-purple-50 text-purple-700 border-purple-200',
  shipped:    'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-red-50 text-red-600 border-red-200',
  refunded:   'bg-slate-100 text-slate-600 border-slate-200',
  paid:       'bg-green-50 text-green-700 border-green-200',
  failed:     'bg-red-50 text-red-600 border-red-200',
  hot:        'bg-orange-50 text-orange-700 border-orange-200',
  new:        'bg-blue-50 text-blue-700 border-blue-200',
  sale:       'bg-rose-50 text-rose-700 border-rose-200',
  top:        'bg-amber-50 text-amber-700 border-amber-200',
  admin:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  customer:   'bg-slate-100 text-slate-600 border-slate-200',
  active:     'bg-green-50 text-green-700 border-green-200',
  inactive:   'bg-slate-100 text-slate-500 border-slate-200',
  published:  'bg-green-50 text-green-700 border-green-200',
  draft:      'bg-slate-100 text-slate-500 border-slate-200',
  quoted:     'bg-cyan-50 text-cyan-700 border-cyan-200',
  fulfilled:  'bg-green-50 text-green-700 border-green-200',
  rejected:   'bg-red-50 text-red-600 border-red-200',
  requested:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved:   'bg-blue-50 text-blue-700 border-blue-200',
  received:   'bg-cyan-50 text-cyan-700 border-cyan-200',
  default:    'bg-slate-100 text-slate-600 border-slate-200',
}

const labels: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmée', processing: 'En cours',
  shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée', refunded: 'Remboursée',
  paid: 'Payé', failed: 'Échoué', hot: 'Hot', new: 'Nouveau', sale: 'Promo', top: 'Top',
  admin: 'Admin', customer: 'Client', active: 'Actif', inactive: 'Inactif',
  published: 'Publié', draft: 'Brouillon',
  quoted: 'Devis envoyé', fulfilled: 'Traitée', rejected: 'Refusée',
  requested: 'Demandé', approved: 'Approuvé', received: 'Reçu',
}

export function Badge({ label, color }: Props) {
  const key = color ?? label
  const cls = colors[key] ?? colors.default
  const display = labels[label] ?? label
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${cls}`}>
      {display}
    </span>
  )
}
