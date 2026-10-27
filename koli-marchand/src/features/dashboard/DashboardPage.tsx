import { useState } from 'react'
import { DollarSign, ShoppingCart, ShoppingBag, UserPlus, Wallet, RotateCcw, PackageX, BookOpen } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { useDashboard } from './api/useDashboard'
import { usePeriod } from './hooks/usePeriod'
import { BestSellers } from './components/BestSellers'
import { RecentOrdersTable } from './components/RecentOrdersTable'
import { useMetricsDictionary, useSellerOverview } from './overview/api'
import { OverviewKpiCard } from './overview/OverviewKpiCard'
import { AlertsPanel } from './overview/AlertsPanel'
import { RevenueNotice } from './overview/RevenueNotice'
import { DefinitionsDrawer } from './overview/DefinitionsDrawer'
import { fmtInt, fmtRate, fmtXof } from './overview/format'

/**
 * Accueil du tableau de bord marchand — 7 indicateurs du dictionnaire des
 * métriques (calculés par le serveur, commandes payées uniquement), alertes
 * actives, puis meilleures ventes et dernières commandes.
 */
export default function DashboardPage() {
  const { period, setPeriod, customRange, setCustomRange, range } = usePeriod()
  const { data, isLoading, isError, refetch, isPlaceholderData } = useSellerOverview(range)
  const { data: dict } = useMetricsDictionary()
  const { data: legacy } = useDashboard()
  const [showDefs, setShowDefs] = useState(false)
  const k = data?.kpis
  const pts = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}\u00A0pt${Math.abs(n) >= 2 ? 's' : ''}`

  return (
    <div>
      <DashboardHeader period={period} onPeriodChange={setPeriod} customRange={customRange} onCustomRangeChange={setCustomRange} />
      <RevenueNotice onShowDefinitions={() => setShowDefs(true)} />

      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-bold text-[#0a0a0b]">Indicateurs clés</h2>
        <button type="button" onClick={() => setShowDefs(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b6b68] hover:text-[#0a0a0b]">
          <BookOpen size={14} aria-hidden /> Définitions
        </button>
      </div>

      {isError ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Impossible de charger les indicateurs. <button type="button" onClick={() => refetch()} className="font-semibold underline">Réessayer</button>
        </div>
      ) : (
        <div className={`grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
          aria-busy={isLoading}>
          {!k ? Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-[178px] rounded-2xl bg-white border border-[#e8e8e4] animate-pulse" />
          )) : (
            <>
              <OverviewKpiCard label="Chiffre d'affaires HT" value={fmtXof(k.revenueHt.current)} kpi={k.revenueHt} formatAbs={fmtXof}
                definition={dict?.revenueHt} icon={<DollarSign size={16} />} accent="#1E90FF" />
              <OverviewKpiCard label="Commandes valides" value={fmtInt(k.validOrders.current)} kpi={k.validOrders} formatAbs={fmtInt}
                definition={dict?.validOrders} icon={<ShoppingCart size={16} />} accent="#8b5cf6" />
              <OverviewKpiCard label="Panier moyen HT" value={fmtXof(k.avgBasket.current)} kpi={k.avgBasket} formatAbs={fmtXof}
                definition={dict?.avgBasket} icon={<ShoppingBag size={16} />} accent="#0ea5e9" />
              <OverviewKpiCard label="Nouveaux clients" value={fmtInt(k.newCustomers.current)} kpi={k.newCustomers} formatAbs={fmtInt}
                definition={dict?.newCustomers} icon={<UserPlus size={16} />} accent="#f59e0b" />
              {/* Net : jamais un « 0 F CFA » trompeur quand la commission est inconnue */}
              {k.netRevenue.coveragePct === 0 ? (
                <OverviewKpiCard label="Net perçu" value="Non disponible"
                  definition={dict?.netRevenue} icon={<Wallet size={16} />} accent="#10b981"
                  footnote="La commission de ces ventes n'a pas été enregistrée au paiement (ventes antérieures au 27 septembre 2026). Le net s'affichera pour les ventes suivantes." />
              ) : (
                <OverviewKpiCard label="Net perçu" value={fmtXof(k.netRevenue.current)} kpi={k.netRevenue} formatAbs={fmtXof}
                  definition={dict?.netRevenue} icon={<Wallet size={16} />} accent="#10b981"
                  footnote={k.netRevenue.coveragePct != null && k.netRevenue.coveragePct < 100
                    ? <>Calculé sur {fmtRate(k.netRevenue.coveragePct)} du CA : la commission des ventes plus anciennes n'est pas connue.</>
                    : undefined} />
              )}
              <OverviewKpiCard label="Taux de retour" value={fmtRate(k.returnRate.current)} kpi={k.returnRate} formatAbs={pts} invert
                definition={dict?.returnRate} icon={<RotateCcw size={16} />} accent="#f43f5e"
                footnote={k.returnRate.returnedUnits > 0 ? <>{fmtInt(k.returnRate.returnedUnits)} article(s), soit {fmtXof(k.returnRate.returnedValue)}</> : undefined} />
              <OverviewKpiCard label="Stock à risque" value={`${fmtInt(k.stockAtRisk.current)} produit${k.stockAtRisk.current > 1 ? 's' : ''}`}
                definition={dict?.stockAtRisk} icon={<PackageX size={16} />} accent="#64748b"
                footnote={<>{fmtInt(k.stockAtRisk.outOfStock)} en rupture · {fmtInt(k.stockAtRisk.atRisk)} bientôt épuisé{k.stockAtRisk.atRisk > 1 ? 's' : ''} (moins de 7 j). Stock du jour, quelle que soit la période.</>} />
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div>{data && <AlertsPanel alerts={data.alerts} />}</div>
        <div className="xl:col-span-2">{legacy && <BestSellers products={legacy.bestSellers} />}</div>
      </div>

      {legacy && <RecentOrdersTable orders={legacy.recentOrders} />}

      {showDefs && dict && <DefinitionsDrawer metrics={Object.values(dict)} onClose={() => setShowDefs(false)} />}
    </div>
  )
}
