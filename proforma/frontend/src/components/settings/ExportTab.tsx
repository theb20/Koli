import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet } from '../ui/Icon'
import { API_BASE, api } from '../../lib/api'
import { formatMoney } from '../../lib/money'
import type { Role, Currency } from '../../types'

interface VatRow {
  rate: number
  base: number
  vat: number
  currency: string
}

export function ExportTab({ companyId, myRole }: { companyId: string; myRole?: Role }) {
  const canExport = myRole === 'ADMIN' || myRole === 'COMPTABLE'
  const currentYear = new Date().getFullYear()
  const [from, setFrom] = useState(`${currentYear}-01-01`)
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))
  const [vat, setVat] = useState<{ rows: VatRow[] } | null>(null)

  useEffect(() => {
    if (!canExport) return
    api.get<{ rows: VatRow[] }>(`/api/companies/${companyId}/export/vat-report?from=${from}&to=${to}`).then(setVat)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, from, to])

  if (!canExport) {
    return (
      <div className="max-w-2xl border border-border bg-white p-5">
        <p className="text-sm text-muted">L'export comptable est réservé aux rôles Administrateur et Comptable.</p>
      </div>
    )
  }

  const csvUrl = (type: 'proformas' | 'invoices') => `${API_BASE}/api/companies/${companyId}/export/csv?type=${type}&from=${from}&to=${to}`
  const vatCsvUrl = `${API_BASE}/api/companies/${companyId}/export/vat-report?format=csv&from=${from}&to=${to}`

  const totalVat = vat?.rows.reduce((sum, r) => sum + r.vat, 0) || 0
  const currency = (vat?.rows[0]?.currency || 'XOF') as Currency

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="border border-border bg-white p-5">
        <p className="mb-4 text-sm font-bold text-ink">Période d'export</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink">Du</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 border border-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink">Au</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 border border-border px-3 text-sm" />
          </label>
        </div>
      </div>

      <div className="border border-border bg-white p-5">
        <p className="mb-4 text-sm font-bold text-ink">Exports CSV / Excel</p>
        <div className="flex flex-col gap-2.5">
          <a href={csvUrl('proformas')} className="flex items-center gap-2.5 border border-border px-4 py-3 text-sm font-medium hover:bg-gray-50">
            <FileSpreadsheet size={16} className="text-brand" /> Exporter les proformas (CSV)
          </a>
          <a href={csvUrl('invoices')} className="flex items-center gap-2.5 border border-border px-4 py-3 text-sm font-medium hover:bg-gray-50">
            <FileSpreadsheet size={16} className="text-brand" /> Exporter les factures (CSV)
          </a>
          <a href={vatCsvUrl} className="flex items-center gap-2.5 border border-border px-4 py-3 text-sm font-medium hover:bg-gray-50">
            <Download size={16} className="text-brand" /> Rapport de TVA collectée (CSV)
          </a>
        </div>
        <p className="mt-2 text-[11px] text-muted">Les fichiers CSV s'ouvrent directement dans Excel/Google Sheets (compatible UTF-8, séparateur point-virgule).</p>
      </div>

      <div className="border border-border bg-white p-5">
        <p className="mb-4 text-sm font-bold text-ink">Aperçu — TVA collectée sur factures émises</p>
        {!vat || vat.rows.length === 0 ? (
          <p className="text-sm text-muted">Aucune facture sur cette période.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase text-muted">
                <th className="py-2">Taux</th>
                <th className="py-2 text-right">Base HT</th>
                <th className="py-2 text-right">TVA collectée</th>
              </tr>
            </thead>
            <tbody>
              {vat.rows.map((r) => (
                <tr key={r.rate} className="border-b border-border last:border-0">
                  <td className="py-2">{r.rate}%</td>
                  <td className="py-2 text-right">{formatMoney(r.base, r.currency as Currency)}</td>
                  <td className="py-2 text-right font-semibold text-ink">{formatMoney(r.vat, r.currency as Currency)}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-2 font-bold text-ink">Total</td>
                <td />
                <td className="pt-2 text-right font-bold text-brand">{formatMoney(totalVat, currency)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
