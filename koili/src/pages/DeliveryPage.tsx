import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Truck, Phone, Camera, CheckCircle2, Circle, Loader2, MapPin } from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE } from '../lib/api'
import { PageMeta } from '../components/seo/PageMeta'

type DeliveryStep = { label: string; done: boolean; timestamp?: string | null }
type DeliveryData = {
  orderNumber: string; status: string
  driverName?: string | null; driverPhone?: string | null; photo?: string | null
  steps: DeliveryStep[]
}

export default function DeliveryPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['delivery', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/delivery/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      return json.data as DeliveryData
    },
    enabled: !!id && !!token,
    refetchInterval: 30_000,
  })

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-gray-300" /></div>

  const d = data

  return (
    <>
      <PageMeta title={`Suivi livraison — ${id}`} description="Suivez votre livraison en temps réel" path={`/commandes/${id}/suivi`} noIndex />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-xl mx-auto px-4 pt-6 pb-20">
          <div className="flex items-center gap-3 mb-6">
            <Link to={`/commandes/${id}`} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
              <ArrowLeft size={15} /> Retour à la commande
            </Link>
          </div>

          <h1 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <Truck size={20} className="text-blue-600" /> Suivi de livraison
          </h1>

          {/* Driver card */}
          {d?.driverName && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Truck size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 font-semibold">Votre livreur</p>
                <p className="text-sm font-bold text-gray-900">{d.driverName}</p>
              </div>
              {d.driverPhone && (
                <a href={`tel:${d.driverPhone}`}
                  className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Phone size={16} className="text-white" />
                </a>
              )}
            </div>
          )}

          {/* Map placeholder */}
          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl h-48 mb-5 flex items-center justify-center border border-blue-200">
            <div className="text-center">
              <MapPin size={32} className="text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-blue-700">Suivi GPS disponible bientôt</p>
            </div>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Étapes de livraison</h2>
            <div className="space-y-0">
              {(d?.steps ?? []).map((step, i, arr) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-4 relative pb-6 last:pb-0"
                >
                  {i < arr.length - 1 && (
                    <div className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${step.done ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    step.done ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
                  }`}>
                    {step.done
                      ? <CheckCircle2 size={14} className="text-white" />
                      : <Circle size={14} className="text-gray-300" />}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className={`text-sm font-semibold ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                    {step.timestamp && <p className="text-xs text-gray-400 mt-0.5">{new Date(step.timestamp).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Delivery photo */}
          {d?.photo && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Camera size={16} className="text-gray-400" />
                <p className="text-sm font-bold text-gray-900">Photo de livraison</p>
              </div>
              <img src={d.photo} alt="Photo de livraison" className="w-full rounded-xl object-cover max-h-60" />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
