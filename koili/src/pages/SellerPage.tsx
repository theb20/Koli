import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Store, TrendingUp, Package, DollarSign, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE } from '../lib/api'
import type { ApiResponse } from '../lib/api'
import { PageMeta } from '../components/seo/PageMeta'

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

function StatBox({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">{icon}</div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

type StoreData = {
  name: string
  description?: string
  logo?: string
  isApproved: boolean
}

type StatsData = {
  revenue: number
  totalOrders: number
  totalProducts: number
}

export default function SellerPage() {
  const { token } = useAuth()
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', description: '', phone: '', address: '' })
  const [step, setStep] = useState<'check' | 'register' | 'dashboard'>('check')

  const { data: storeData, isLoading } = useQuery<ApiResponse<{ store?: StoreData }>>({
    queryKey: ['seller-store'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/seller/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      return json as ApiResponse<{ store?: StoreData }>
    },
    enabled: !!token,
  })

  // Sync step après chargement
  useEffect(() => {
    if (storeData) {
      if (storeData.data?.store && step !== 'dashboard') setStep('dashboard')
      else if (!storeData.data?.store && step !== 'register') setStep('register')
    }
  }, [storeData, step])

  const { data: statsData } = useQuery<ApiResponse<StatsData>>({
    queryKey: ['seller-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/seller/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      return json as ApiResponse<StatsData>
    },
    enabled: step === 'dashboard',
  })

  const register = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/seller/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-store'] })
      setStep('dashboard')
    },
  })

  const store: StoreData | undefined = storeData?.data?.store
  const stats: StatsData | undefined = statsData?.data

  return (
    <>
      <PageMeta title="Espace Vendeur — Koli" description="Gérez votre boutique sur Koli" path="/vendeur" noIndex />
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Store size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Espace Vendeur</h1>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-gray-300" />
            </div>
          )}

          {/* Register form */}
          {!isLoading && step === 'register' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 max-w-lg mx-auto">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Créez votre boutique</h2>
              <p className="text-sm text-gray-500 mb-6">Rejoignez le marketplace Koli et vendez vos produits à des milliers de clients.</p>

              <div className="space-y-4">
                {[
                  { key: 'name', label: 'Nom de la boutique *', placeholder: 'Ex: TechShop CI' },
                  { key: 'description', label: 'Description', placeholder: 'Décrivez votre boutique en quelques mots' },
                  { key: 'phone', label: 'Téléphone', placeholder: '+225 07 00 00 00 00' },
                  { key: 'address', label: 'Adresse', placeholder: 'Abidjan, Plateau' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</label>
                    {f.key === 'description' ? (
                      <textarea
                        value={form[f.key as keyof typeof form]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        rows={3}
                        className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={form[f.key as keyof typeof form]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>

              {register.error && (
                <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-600">{(register.error as Error).message}</p>
                </div>
              )}

              <button
                onClick={() => register.mutate()}
                disabled={!form.name || register.isPending}
                className="mt-6 w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {register.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                {register.isPending ? 'Création…' : 'Créer ma boutique'}
              </button>

              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">Votre boutique sera examinée par notre équipe avant d'être approuvée (48h max).</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Dashboard */}
          {!isLoading && step === 'dashboard' && store && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Store header */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  {store.logo ? <img src={store.logo} alt="" className="w-full h-full object-cover rounded-xl" /> : <Store size={24} className="text-blue-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900">{store.name}</h2>
                    {store.isApproved
                      ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Approuvée</span>
                      : <span className="flex items-center gap-1 text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full"><AlertCircle size={11} /> En attente</span>}
                  </div>
                  {store.description && <p className="text-sm text-gray-500 mt-1">{store.description}</p>}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <StatBox icon={<DollarSign size={18} className="text-blue-600" />} label="Revenus nets" value={stats ? fmt(stats.revenue) : '…'} sub="Commandes livrées" />
                <StatBox icon={<Package size={18} className="text-blue-600" />} label="Commandes" value={stats?.totalOrders?.toString() ?? '…'} />
                <StatBox icon={<TrendingUp size={18} className="text-blue-600" />} label="Produits listés" value={stats?.totalProducts?.toString() ?? '…'} />
              </div>

              {/* Pending approval notice */}
              {!store.isApproved && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Boutique en cours de validation</p>
                      <p className="text-sm text-amber-700 mt-1">Notre équipe examine votre dossier. Vous serez notifié(e) par email dès l'approbation. Vos produits seront visibles sur le marketplace ensuite.</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}
