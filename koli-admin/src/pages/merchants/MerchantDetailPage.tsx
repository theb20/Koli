import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Store, Mail, Phone, MapPin, Package, ShoppingCart, TrendingUp, Ban, CheckCircle2 } from 'lucide-react'
import { api, fmt, fmtDate, fmtDateTime } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Card, StatCard } from '../../components/ui/Card'
import { Confirm } from '../../components/ui/Modal'

interface MerchantDetail {
  seller: {
    id: number; name: string; description: string | null; logo: string | null; banner: string | null
    phone: string | null; address: string | null; isApproved: boolean; createdAt: string
    owner: { id: string; prenom: string; nom: string; email: string; isBanned: boolean; createdAt: string }
  }
  stats: { productCount: number; orderCount: number; revenue: number; byStatus: Record<string, number> }
  recentOrders: { orderNumber: string; status: string; createdAt: string; client: string; total: number }[]
  recentProducts: { id: number; name: string; price: number; stock: number; isActive: boolean; image: string | null }[]
}

async function fetchMerchant(id: string) {
  const { data } = await api.get(`/api/admin/sellers/${id}`)
  return data.data as MerchantDetail
}

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmToggle, setConfirmToggle] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sellers', id],
    queryFn:  () => fetchMerchant(id!),
    enabled:  !!id,
  })

  const toggleStatus = useMutation({
    mutationFn: (isApproved: boolean) => api.patch(`/api/admin/sellers/${id}/status`, { isApproved }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sellers'] })
      setConfirmToggle(false)
    },
  })

  if (isLoading || !data) {
    return <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Chargement…</div>
  }

  const { seller, stats, recentOrders, recentProducts } = data

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/merchants')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft size={15} /> Marchands
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
            {seller.logo ? <img src={seller.logo} alt="" className="w-full h-full object-cover" /> : <Store size={22} className="text-slate-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{seller.name}</h1>
              <Badge label={seller.isApproved ? 'active' : 'inactive'} color={seller.isApproved ? 'active' : 'inactive'} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Marchand depuis le {fmtDate(seller.createdAt)}</p>
          </div>
        </div>
        <button
          onClick={() => setConfirmToggle(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            seller.isApproved
              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
              : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
          }`}
        >
          {seller.isApproved ? <><Ban size={15} /> Suspendre</> : <><CheckCircle2 size={15} /> Réactiver</>}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Produits" value={stats.productCount} icon={<Package size={18} />} color="blue" />
        <StatCard title="Commandes" value={stats.orderCount} icon={<ShoppingCart size={18} />} color="purple" />
        <StatCard title="Chiffre d'affaires" value={fmt(stats.revenue)} icon={<TrendingUp size={18} />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Informations</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Mail size={14} className="text-slate-400 shrink-0" />
              <span className="truncate">{seller.owner.email}</span>
            </div>
            {seller.phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone size={14} className="text-slate-400 shrink-0" />
                <span>{seller.phone}</span>
              </div>
            )}
            {seller.address && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <span>{seller.address}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Propriétaire</p>
              <p className="text-slate-700">{seller.owner.prenom} {seller.owner.nom}</p>
              {seller.owner.isBanned && <Badge label="inactive" color="rejected" />}
            </div>
            {seller.description && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Description</p>
                <p className="text-slate-600 leading-relaxed">{seller.description}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Commandes récentes</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Aucune commande</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-2">Commande</th>
                    <th className="pb-2">Client</th>
                    <th className="pb-2">Statut</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map(o => (
                    <tr key={o.orderNumber}>
                      <td className="py-2.5 font-medium text-slate-900">{o.orderNumber}</td>
                      <td className="py-2.5 text-slate-500">{o.client}</td>
                      <td className="py-2.5"><Badge label={o.status} /></td>
                      <td className="py-2.5 text-right text-slate-700">{fmt(o.total)}</td>
                      <td className="py-2.5 text-right text-xs text-slate-400">{fmtDateTime(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Produits récents</h2>
        {recentProducts.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Aucun produit</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {recentProducts.map(p => (
              <Link key={p.id} to={`/products?edit=${p.id}`} className="border border-slate-100 rounded-xl p-2.5 hover:border-slate-200 transition-colors">
                <div className="aspect-square rounded-lg bg-slate-50 overflow-hidden mb-2">
                  {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                <p className="text-xs text-slate-500">{fmt(p.price)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge label={p.isActive ? 'active' : 'inactive'} color={p.isActive ? 'active' : 'inactive'} />
                  {p.stock === 0 && <span className="text-[10px] text-red-500 font-medium">Rupture</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Confirm
        open={confirmToggle}
        onClose={() => setConfirmToggle(false)}
        onConfirm={() => toggleStatus.mutate(!seller.isApproved)}
        loading={toggleStatus.isPending}
        title={seller.isApproved ? 'Suspendre ce marchand ?' : 'Réactiver ce marchand ?'}
        message={seller.isApproved
          ? "Le marchand ne pourra plus ajouter ni modifier de produits tant qu'il n'est pas réactivé. Ses produits déjà en ligne restent visibles."
          : 'Le marchand pourra de nouveau gérer son catalogue.'}
        confirmLabel={seller.isApproved ? 'Suspendre' : 'Réactiver'}
      />
    </div>
  )
}
