import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import {
  User, Package, MapPin, Heart, Bell, Shield, LogOut,
  Edit2, Camera, Check, ChevronRight,
  Truck, Clock, CheckCircle2, AlertCircle, Trash2,
  Plus, Eye, EyeOff, Mail, Phone,
  Award, TrendingUp, ShoppingBag, Gift,
  Lock, RefreshCw, Loader2,
  MessageCircle, ExternalLink, X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { fetchLoyalty, fetchReferral, fetchMyGiftLists, createGiftList, fetchAddresses } from '../lib/api'
import { useSiteSettings, waLink } from '../hooks/useSiteSettings'
import { VILLES_CI } from '../constants/villesCI'

/* ─────────────────────────────────────────────────────────────
   API helper
───────────────────────────────────────────────────────────── */
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

async function apiFetch<T = unknown>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Erreur')
  return json.data as T
}

/* Types*/
type Tab = 'profil' | 'commandes' | 'adresses' | 'favoris' | 'notifications' | 'securite' | 'fidelite'

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

type ApiOrder = {
  id: string; orderNumber: string; status: OrderStatus; total: number
  createdAt: string; items: { name: string; image?: string }[]
}

type MappedOrder = {
  id: string; date: string; status: OrderStatus
  total: number; itemCount: number; image: string; label: string
}

type Address = {
  id: string; label: string; prenom: string; nom: string
  telephone: string; ville: string; adresse: string; isDefault: boolean
  quartier?: string | null
}

type AddressForm = Omit<Address, 'id' | 'isDefault'>

type WishlistItem = {
  id: string; productId: number
  product: {
    id: number; name: string; price: number; oldPrice?: number | null
    brand?: string | null; slug?: string | null
    images: { url: string }[]
  }
}

type ApiNotif = {
  id: string; title: string; body: string
  type: string; isRead: boolean; createdAt: string
}

type Session = {
  id: string; userAgent?: string | null
  ipAddress?: string | null; createdAt: string
}

type FullProfile = {
  id: string; prenom: string; nom: string; email: string
  telephone?: string | null; avatar?: string | null
  genre?: string | null; naissance?: string | null
  role: string; isVerified: boolean; createdAt: string
  subscribedToNewsletter: boolean
  _count: { orders: number; wishlist: number; reviews: number }
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' FCFA'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:    { label: 'En attente',     color: 'text-amber-700',   bg: 'bg-amber-50   border-amber-200',   dot: 'bg-amber-400'   },
  confirmed:  { label: 'Confirmée',      color: 'text-blue-700',    bg: 'bg-blue-50    border-blue-200',     dot: 'bg-blue-500'    },
  processing: { label: 'En préparation', color: 'text-violet-700',  bg: 'bg-violet-50  border-violet-200',   dot: 'bg-violet-500'  },
  shipped:    { label: 'Expédiée',       color: 'text-cyan-700',    bg: 'bg-cyan-50    border-cyan-200',     dot: 'bg-cyan-500'    },
  delivered:  { label: 'Livrée',         color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200',  dot: 'bg-emerald-500' },
  cancelled:  { label: 'Annulée',        color: 'text-red-700',     bg: 'bg-red-50     border-red-200',      dot: 'bg-red-400'     },
  refunded:   { label: 'Remboursée',     color: 'text-red-700',     bg: 'bg-red-50     border-red-200',      dot: 'bg-red-400'     },
}

const SIDEBAR_ITEMS: { tab: Tab; icon: React.ReactNode; label: string }[] = [
  { tab: 'profil',        icon: <User size={17} />,    label: 'Mon profil'         },
  { tab: 'commandes',     icon: <Package size={17} />, label: 'Mes commandes'      },
  { tab: 'adresses',      icon: <MapPin size={17} />,  label: 'Mes adresses'       },
  { tab: 'favoris',       icon: <Heart size={17} />,   label: 'Mes favoris'        },
  { tab: 'notifications', icon: <Bell size={17} />,    label: 'Notifications'      },
  { tab: 'securite',      icon: <Shield size={17} />,  label: 'Sécurité'           },
  { tab: 'fidelite',      icon: <Gift size={17} />,    label: 'Fidélité & Cadeaux' },
]

/* ─────────────────────────────────────────────────────────────
   Avatar
───────────────────────────────────────────────────────────── */
function Avatar({ src, name, size = 'md', editable = false, onChange }: {
  src?: string; name: string; size?: 'sm' | 'md' | 'lg' | 'xl'
  editable?: boolean; onChange?: (src: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const sz = { sm: 'w-10 h-10 text-sm', md: 'w-14 h-14 text-base', lg: 'w-20 h-20 text-xl', xl: 'w-28 h-28 text-3xl' }[size]
  const camSz = { sm: 14, md: 14, lg: 16, xl: 20 }[size]

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onChange) return
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className={`relative shrink-0 ${sz} rounded-full`}>
      {src
        ? <img src={src} alt={name} className={`${sz} rounded-full object-cover border-4 border-white shadow-md`} />
        : <div className={`${sz} rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-bold text-white border-4 border-white shadow-md`}>{initials}</div>
      }
      {editable && (
        <>
          <button onClick={() => inputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors border-2 border-white">
            <Camera size={camSz} />
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   StatusBadge
───────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   Toggle
───────────────────────────────────────────────────────────── */
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-gray-900' : 'bg-gray-200'}`}>
      <motion.div animate={{ x: on ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md" />
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB — PROFIL
═══════════════════════════════════════════════════════════════ */
function TabProfil({ avatar, setAvatar, orders, profile }: {
  avatar: string; setAvatar: (s: string) => void
  orders: MappedOrder[]; profile: FullProfile
}) {
  const { token, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    prenom:    profile.prenom,
    nom:       profile.nom,
    telephone: profile.telephone ?? '',
    naissance: profile.naissance ? profile.naissance.split('T')[0] : '',
    genre:     profile.genre ?? '',
  })
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    setForm(f => ({
      ...f,
      prenom:    profile.prenom,
      nom:       profile.nom,
      telephone: profile.telephone ?? '',
      naissance: profile.naissance ? profile.naissance.split('T')[0] : '',
      genre:     profile.genre ?? '',
    }))
  }, [profile.prenom, profile.nom, profile.telephone, profile.naissance, profile.genre])

  const handleSave = async () => {
    setSaving(true); setSaveErr(null)
    try {
      await apiFetch('/api/auth/profile', token, {
        method: 'PUT',
        body: JSON.stringify({
          prenom:    form.prenom    || undefined,
          nom:       form.nom       || undefined,
          telephone: form.telephone || undefined,
          genre:     form.genre     || undefined,
          naissance: form.naissance || undefined,
          ...(avatar ? { avatar } : {}),
        }),
      })
      updateUser({ prenom: form.prenom, nom: form.nom, avatar: avatar || undefined })
      setSaved(true); setEditing(false)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Erreur de mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const totalSpent = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
  const loyaltyPts = Math.floor(totalSpent / 1000)
  const memberSince = new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden p-6 text-white">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-10 -translate-x-10" />
        <div className="relative flex items-center gap-5">
          <Avatar src={avatar || profile.avatar || undefined} name={`${form.prenom} ${form.nom}`} size="xl" editable onChange={setAvatar} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-xl font-bold">{form.prenom} {form.nom}</h2>
              {profile.isVerified && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 size={10} /> Vérifié
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">{profile.email}</p>
            <p className="text-gray-500 text-xs mt-0.5">{form.telephone}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Award size={13} className="text-yellow-400" />
              <span className="text-xs text-yellow-400 font-semibold">{loyaltyPts} points fidélité</span>
              <span className="text-gray-600 text-xs">· Membre depuis {memberSince}</span>
            </div>
          </div>
          <button onClick={() => { setEditing(e => !e); setSaveErr(null) }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium">
            <Edit2 size={13} /> Modifier
          </button>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-3">
          {[
            { icon: <ShoppingBag size={16} />, value: profile._count.orders, label: 'Commandes', color: 'text-blue-400' },
            { icon: <TrendingUp size={16} />,  value: fmt(totalSpent),         label: 'Total dépensé', color: 'text-emerald-400' },
            { icon: <Gift size={16} />,        value: `${loyaltyPts} pts`,    label: 'Points fidélité', color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl px-3 py-3 text-center border border-white/10">
              <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
              <p className="text-white font-bold text-sm leading-tight">{s.value}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire édition */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Edit2 size={15} className="text-blue-500" /> Modifier mes informations
            </h3>
            {saveErr && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm mb-4">
                <AlertCircle size={14} /> {saveErr}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { label: 'Prénom',           key: 'prenom',    type: 'text',  icon: <User size={14} /> },
                { label: 'Nom',              key: 'nom',       type: 'text',  icon: <User size={14} /> },
                { label: 'Date de naissance',key: 'naissance', type: 'date',  icon: null },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">{f.label}</label>
                  <div className="flex items-center gap-2 px-3.5 py-3 border-2 border-gray-200 rounded-xl focus-within:border-gray-400 transition-colors bg-white">
                    {f.icon && <span className="text-gray-400 shrink-0">{f.icon}</span>}
                    <input type={f.type} value={form[f.key]} onChange={e => set(f.key)(e.target.value)}
                      className="flex-1 text-sm focus:outline-none text-gray-800 bg-transparent" />
                  </div>
                </div>
              ))}

              {/* Téléphone */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Téléphone</label>
                <div className="flex items-center rounded-xl border-2 border-gray-200 focus-within:border-gray-400 transition-colors overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-3 bg-gray-50 border-r border-gray-200 shrink-0 select-none">
                    <span className="text-base leading-none">🇨🇲</span>
                    <span className="text-sm font-semibold text-gray-700">+237</span>
                  </div>
                  <input type="tel" value={form.telephone} onChange={e => set('telephone')(e.target.value)}
                    placeholder="6 XX XX XX XX" maxLength={12} inputMode="tel"
                    className="flex-1 px-3.5 py-3 text-sm focus:outline-none text-gray-800 bg-white placeholder:text-gray-300" />
                </div>
              </div>

              {/* Genre */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Genre</label>
                <select value={form.genre} onChange={e => set('genre')(e.target.value)}
                  className="w-full px-3.5 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-white transition-colors">
                  <option value="">—</option>
                  <option>Homme</option><option>Femme</option><option>Autre</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditing(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {saved && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-medium">
          <CheckCircle2 size={16} /> Vos informations ont été mises à jour avec succès.
        </motion.div>
      )}

      {/* Infos actuelles */}
      {!editing && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User size={15} className="text-blue-500" /> Informations personnelles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: <User size={14} />,  label: 'Nom complet', value: `${form.prenom} ${form.nom}` },
              { icon: <Mail size={14} />,  label: 'E-mail',      value: profile.email },
              { icon: <Phone size={14} />, label: 'Téléphone',   value: form.telephone || '—' },
              { icon: <Clock size={14} />, label: 'Naissance',   value: form.naissance ? new Date(form.naissance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { icon: <User size={14} />,  label: 'Genre',       value: form.genre || '—' },
              { icon: <Award size={14} />, label: 'Statut',      value: loyaltyPts >= 200 ? '⭐ Gold' : loyaltyPts >= 50 ? '🥈 Silver' : '🥉 Bronze' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <span className="text-gray-400 mt-0.5 shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fidélité */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-yellow-500" />
            <span className="font-bold text-gray-900">Programme Fidélité Koli</span>
          </div>
          <span className="text-sm font-bold text-yellow-600 bg-yellow-100 px-2.5 py-1 rounded-full">{loyaltyPts} / 200 pts</span>
        </div>
        <div className="h-2.5 rounded-full bg-yellow-100 overflow-hidden mb-2">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-400"
            initial={{ width: 0 }} animate={{ width: `${Math.min((loyaltyPts / 200) * 100, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }} />
        </div>
        <p className="text-xs text-gray-600">
          {200 - loyaltyPts > 0
            ? <>Plus que <strong>{200 - loyaltyPts} points</strong> pour passer au niveau Gold !</>
            : <>🎉 Félicitations ! Vous avez atteint le statut <strong>Gold</strong> !</>}
        </p>
        <div className="flex gap-2 mt-3">
          {[
            { pts: 0,   label: '🥉 Bronze', active: loyaltyPts >= 0   },
            { pts: 50,  label: '🥈 Silver', active: loyaltyPts >= 50  },
            { pts: 200, label: '⭐ Gold',   active: loyaltyPts >= 200 },
          ].map(tier => (
            <div key={tier.label} className={`flex-1 text-center px-2 py-2 rounded-xl border text-xs font-semibold transition-all ${
              tier.active ? 'bg-yellow-400 border-yellow-500 text-white shadow-sm' : 'bg-white border-yellow-200 text-gray-400'
            }`}>{tier.label}</div>
          ))}
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Package size={15} className="text-blue-500" /> Dernières commandes</h3>
        </div>
        {orders.length === 0
          ? <p className="text-sm text-gray-400 text-center py-6">Aucune commande pour l'instant.</p>
          : (
            <div className="space-y-3">
              {orders.slice(0, 3).map(o => (
                <Link key={o.id} to={`/commandes/${o.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center">
                    {o.image ? <img src={o.image} alt={o.label} className="w-12 h-12 rounded-xl object-cover" /> : <Package size={20} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 font-mono">{o.id}</p>
                    <p className="text-sm font-semibold text-gray-800 line-clamp-1">{o.label}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={o.status} />
                    <p className="text-xs text-gray-400 mt-1">{o.date}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                </Link>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB — COMMANDES
═══════════════════════════════════════════════════════════════ */
function TabCommandes({ orders }: { orders: MappedOrder[] }) {
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { status: 'all',       label: 'Toutes',   count: orders.length,                                          icon: <Package size={16} />,      color: 'text-gray-700 bg-gray-50 border-gray-200'         },
          { status: 'shipped',   label: 'En cours', count: orders.filter(o => ['shipped','processing','confirmed'].includes(o.status)).length, icon: <Truck size={16} />, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { status: 'delivered', label: 'Livrées',  count: orders.filter(o => o.status === 'delivered').length,   icon: <CheckCircle2 size={16} />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { status: 'cancelled', label: 'Annulées', count: orders.filter(o => o.status === 'cancelled').length,   icon: <X size={16} />,            color: 'text-red-700 bg-red-50 border-red-200'            },
        ].map(s => (
          <button key={s.status} onClick={() => setFilter(s.status as typeof filter)}
            className={`p-3 rounded-xl border text-left transition-all ${filter === s.status ? `${s.color} ring-2 ring-offset-1 ring-current/30 shadow-sm` : 'bg-white border-gray-100 hover:border-gray-200'}`}>
            <div className={`mb-1.5 ${filter === s.status ? '' : 'text-gray-400'}`}>{s.icon}</div>
            <p className="text-lg font-bold text-gray-900">{s.count}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Package size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucune commande dans cette catégorie</p>
            </motion.div>
          )}
          {filtered.map(order => (
            <motion.div key={order.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-gray-700">{order.id}</span>
                  <StatusBadge status={order.status} />
                </div>
                <span className="text-xs text-gray-400">{order.date}</span>
              </div>
              <div className="flex items-center gap-4 p-5">
                <div className="w-16 h-16 rounded-xl bg-gray-50 shrink-0 flex items-center justify-center">
                  {order.image
                    ? <img src={order.image} alt={order.label} className="w-16 h-16 rounded-xl object-cover" />
                    : <Package size={24} className="text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2">{order.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{order.itemCount} article{order.itemCount > 1 ? 's' : ''}</p>
                  <p className="text-base font-bold text-gray-900 mt-1">{fmt(order.total)}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link to={`/commandes/${order.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors">
                    Détails <ExternalLink size={11} />
                  </Link>
                  {order.status === 'delivered' && (
                    <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-gray-300 transition-colors">
                      <RefreshCw size={11} /> Recommander
                    </button>
                  )}
                </div>
              </div>
              {(['confirmed','processing','shipped'] as OrderStatus[]).includes(order.status) && (
                <div className="px-5 pb-4">
                  <div className="flex items-center gap-1 mb-2">
                    {(['confirmed','processing','shipped','delivered'] as const).map((s, i, arr) => {
                      const current = ['confirmed','processing','shipped','delivered'].indexOf(order.status)
                      const done = i <= current
                      return (
                        <div key={s} className="flex items-center flex-1">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-blue-500' : 'bg-gray-200'}`} />
                          {i < arr.length - 1 && <div className={`flex-1 h-0.5 ${done ? 'bg-blue-400' : 'bg-gray-200'}`} />}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-blue-600 font-medium">
                    {order.status === 'confirmed' ? 'Commande confirmée, préparation à venir'
                    : order.status === 'processing' ? 'En cours de préparation'
                    : 'En route vers vous · Livraison estimée sous 24h'}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB — ADRESSES  (100% API)
═══════════════════════════════════════════════════════════════ */
const EMPTY_FORM: AddressForm = { label: 'Domicile', prenom: '', nom: '', telephone: '', ville: '', quartier: '', adresse: '' }

function TabAdresses() {
  const { token } = useAuth()
  const qc = useQueryClient()

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn:  () => fetchAddresses(token!),
    enabled:  !!token,
  })

  const [editing, setEditing] = useState<Address | null>(null)
  const [adding,  setAdding]  = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState<string | null>(null)
  const [form,    setForm]    = useState<AddressForm>(EMPTY_FORM)
  const setF = (k: keyof AddressForm) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true); setErr(null)
    try {
      if (editing) {
        await apiFetch(`/api/addresses/${editing.id}`, token, {
          method: 'PUT',
          body: JSON.stringify(form),
        })
      } else {
        await apiFetch('/api/addresses', token, {
          method: 'POST',
          body: JSON.stringify(form),
        })
      }
      await qc.invalidateQueries({ queryKey: ['addresses'] })
      setEditing(null); setAdding(false); setForm(EMPTY_FORM)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (a: Address) => {
    setForm({ label: a.label, prenom: a.prenom, nom: a.nom, telephone: a.telephone, ville: a.ville, quartier: a.quartier ?? '', adresse: a.adresse })
    setEditing(a); setAdding(false); setErr(null)
  }

  const remove = async (id: string) => {
    await apiFetch(`/api/addresses/${id}`, token, { method: 'DELETE' })
    qc.invalidateQueries({ queryKey: ['addresses'] })
  }

  const setDefault = async (id: string) => {
    await apiFetch(`/api/addresses/${id}/default`, token, { method: 'PUT' })
    qc.invalidateQueries({ queryKey: ['addresses'] })
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-300" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {addresses.map(addr => (
          <div key={addr.id} className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${addr.isDefault ? 'border-gray-900' : 'border-gray-100 hover:border-gray-200'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"><MapPin size={15} className="text-gray-600" /></div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{addr.label}</p>
                  {addr.isDefault && <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full">Par défaut</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(addr)} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Edit2 size={13} /></button>
                <button onClick={() => remove(addr.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-800">{addr.prenom} {addr.nom}</p>
            <p className="text-xs text-gray-500 mt-0.5">📞 {addr.telephone}</p>
            <p className="text-xs text-gray-500 mt-0.5">📍 {addr.adresse}{addr.quartier ? `, ${addr.quartier}` : ''}, {addr.ville}</p>
            {!addr.isDefault && (
              <button onClick={() => setDefault(addr.id)}
                className="mt-3 text-xs text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Définir par défaut
              </button>
            )}
          </div>
        ))}

        <button onClick={() => { setAdding(true); setEditing(null); setForm(EMPTY_FORM); setErr(null) }}
          className="flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 hover:border-gray-400 hover:bg-gray-50 transition-all min-h-[160px]">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><Plus size={18} className="text-gray-500" /></div>
          <p className="text-sm font-semibold text-gray-600">Ajouter une adresse</p>
        </button>
      </div>

      <AnimatePresence>
        {(adding || editing) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <MapPin size={15} className="text-blue-500" />
              {editing ? "Modifier l'adresse" : 'Nouvelle adresse'}
            </h3>
            {err && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm mb-4"><AlertCircle size={14} />{err}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Étiquette */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Type d'adresse</label>
                <select value={form.label} onChange={e => setF('label')(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-white transition-colors">
                  <option>Domicile</option><option>Bureau</option><option>Autre</option>
                </select>
              </div>
              {([
                { label: 'Prénom', key: 'prenom' },
                { label: 'Nom',    key: 'nom'    },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">{f.label}</label>
                  <input value={form[f.key]} onChange={e => setF(f.key)(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-white transition-colors" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Téléphone</label>
                <div className="flex items-center rounded-xl border-2 border-gray-200 focus-within:border-gray-400 transition-colors overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-3 bg-gray-50 border-r border-gray-200 shrink-0 select-none">
                    <span className="text-base leading-none">🇨🇮</span>
                    <span className="text-sm font-semibold text-gray-700">+225</span>
                  </div>
                  <input type="tel" value={form.telephone} onChange={e => setF('telephone')(e.target.value)}
                    placeholder="07 00 00 00 00" maxLength={14} inputMode="tel"
                    className="flex-1 px-3.5 py-3 text-sm focus:outline-none text-gray-800 bg-white placeholder:text-gray-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Ville</label>
                <select value={form.ville} onChange={e => setF('ville')(e.target.value)}
                  className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-white transition-colors appearance-none ${!form.ville ? 'text-gray-400' : 'text-gray-800'}`}>
                  <option value="">Sélectionner votre ville / commune</option>
                  {Object.entries(VILLES_CI).map(([groupe, villes]) => (
                    <optgroup key={groupe} label={groupe}>
                      {villes.map(v => <option key={v} value={v}>{v}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Quartier / Zone</label>
                <input value={form.quartier ?? ''} onChange={e => setF('quartier')(e.target.value)}
                  placeholder="Zone 4, Riviera, Deux-Plateaux…"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-white transition-colors" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Adresse complète</label>
                <input value={form.adresse} onChange={e => setF('adresse')(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-white transition-colors" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setEditing(null); setAdding(false) }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                {editing ? 'Enregistrer' : "Ajouter l'adresse"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB — FAVORIS  (100% API)
═══════════════════════════════════════════════════════════════ */
function TabFavoris() {
  const { token } = useAuth()
  const qc = useQueryClient()

  const { data: items = [], isLoading } = useQuery<WishlistItem[]>({
    queryKey: ['wishlist'],
    queryFn:  () => apiFetch<WishlistItem[]>('/api/wishlist', token),
  })

  const remove = async (productId: number) => {
    await apiFetch(`/api/wishlist/${productId}`, token, { method: 'DELETE' })
    qc.invalidateQueries({ queryKey: ['wishlist'] })
  }

  const clearAll = async () => {
    await apiFetch('/api/wishlist', token, { method: 'DELETE' })
    qc.invalidateQueries({ queryKey: ['wishlist'] })
  }

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-300" /></div>

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-16 flex flex-col items-center text-center gap-4">
        <Heart size={48} className="text-gray-200" />
        <h3 className="font-bold text-gray-700 text-lg">Votre liste de favoris est vide</h3>
        <p className="text-gray-400 text-sm max-w-xs">Ajoutez des produits à vos favoris pour les retrouver facilement.</p>
        <Link to="/catalogue" className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
          Explorer le catalogue
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} article{items.length > 1 ? 's' : ''} sauvegardé{items.length > 1 ? 's' : ''}</p>
        <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">Tout supprimer</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {items.map(item => {
          const p = item.product
          const imgUrl = p.images?.[0]?.url
          const disc = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                <Link to={`/catalogue/${p.id}`}>
                  {imgUrl
                    ? <img src={imgUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={32} className="text-gray-200" /></div>}
                </Link>
                {disc > 0 && <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-lg">-{disc}%</span>}
                <button onClick={() => remove(p.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                  <X size={13} />
                </button>
              </div>
              <div className="p-3">
                {p.brand && <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{p.brand}</p>}
                <Link to={`/catalogue/${p.id}`}>
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2 mt-0.5 hover:text-blue-600 transition-colors leading-snug">{p.name}</p>
                </Link>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{p.price.toLocaleString('fr-FR')} FCFA</p>
                    {p.oldPrice && <p className="text-[10px] text-gray-400 line-through">{p.oldPrice.toLocaleString('fr-FR')} FCFA</p>}
                  </div>
                  <Link to={`/catalogue/${p.id}`} className="text-[10px] font-bold bg-gray-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">Voir</Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB — NOTIFICATIONS  (API)
═══════════════════════════════════════════════════════════════ */
const NOTIF_ICON: Record<string, string> = {
  order: '📦', promo: '🎁', info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌',
}

function TabNotifications({ initialNewsletter }: { initialNewsletter: boolean }) {
  const { token } = useAuth()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ notifications: ApiNotif[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn:  () => apiFetch<{ notifications: ApiNotif[]; unreadCount: number }>('/api/notifications', token),
    refetchInterval: 30_000,
  })

  const notifs = data?.notifications ?? []
  const unread = data?.unreadCount ?? 0

  const markRead = async (id: string) => {
    await apiFetch(`/api/notifications/${id}/read`, token, { method: 'PUT' })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const markAllRead = async () => {
    await apiFetch('/api/notifications/read-all', token, { method: 'PUT' })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const del = async (id: string) => {
    await apiFetch(`/api/notifications/${id}`, token, { method: 'DELETE' })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <div className="space-y-5">
      {/* Notifications système */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Bell size={15} className="text-blue-500" /> Mes notifications
            {unread > 0 && <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unread}</span>}
          </h3>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-blue-600 font-semibold hover:text-blue-700 transition-colors">
              Tout marquer comme lu
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-8">
            <Bell size={36} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => (
              <div key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl transition-colors cursor-pointer ${n.isRead ? 'bg-gray-50' : 'bg-blue-50 border border-blue-100'}`}>
                <span className="text-lg shrink-0 mt-0.5">{NOTIF_ICON[n.type] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); del(n.id) }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Préférences newsletter (en base) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Mail size={15} className="text-blue-500" /> Préférences de communication
        </h3>
        <NewsletterToggle initialValue={initialNewsletter} />
      </div>
    </div>
  )
}

/* ── Newsletter toggle réel ─────────────────────────────────── */
function NewsletterToggle({ initialValue }: { initialValue: boolean }) {
  const { token } = useAuth()
  const qc = useQueryClient()
  const [subscribed, setSubscribed] = useState(initialValue)
  const [loading,    setLoading]    = useState(false)
  const [msg,        setMsg]        = useState<string | null>(null)

  const handleToggle = async () => {
    setLoading(true); setMsg(null)
    try {
      const res = await apiFetch<{ subscribedToNewsletter: boolean } & { message?: string }>(
        '/api/auth/newsletter', token, { method: 'PATCH' }
      )
      setSubscribed(res.subscribedToNewsletter)
      setMsg(res.subscribedToNewsletter
        ? '✅ Abonnement newsletter activé'
        : '🔕 Vous avez été désabonné(e) de la newsletter')
      // Invalider profil pour sync
      qc.invalidateQueries({ queryKey: ['me'] })
      setTimeout(() => setMsg(null), 3000)
    } catch {
      setMsg('Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${subscribed ? 'border-gray-900 bg-gray-50' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${subscribed ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <Mail size={15} className={subscribed ? 'text-white' : 'text-gray-400'} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Newsletter Koli</p>
            <p className="text-xs text-gray-400">
              {subscribed ? 'Vous recevez les promos et nouveautés' : 'Notifications désactivées'}
            </p>
          </div>
        </div>
        {loading
          ? <Loader2 size={16} className="animate-spin text-gray-400" />
          : <Toggle on={subscribed} onClick={handleToggle} />
        }
      </div>

      {/* Note d'info */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
        <Bell size={13} className="shrink-0 mt-0.5 text-blue-500" />
        <span>
          Lorsqu'activée, vous recevrez les <strong>notifications de nouveautés et offres spéciales</strong> envoyées
          par notre équipe. Vous pouvez vous désabonner à tout moment.
        </span>
      </div>

      {msg && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 font-medium">
          {msg}
        </motion.div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB — SÉCURITÉ  (100% API)
═══════════════════════════════════════════════════════════════ */
function TabSecurite() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  /* ── Mot de passe ── */
  const [showPwd,    setShowPwd]    = useState(false)
  const [showNew,    setShowNew]    = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdErr,     setPwdErr]     = useState<string | null>(null)

  /* ── Sessions ── */
  const { data: sessions = [], isLoading: sessLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn:  () => apiFetch<Session[]>('/api/auth/sessions', token),
  })

  /* ── Suppression compte ── */
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const strength = (() => {
    if (!newPwd) return 0
    let s = 0
    if (newPwd.length >= 8)            s++
    if (/[A-Z]/.test(newPwd))         s++
    if (/[0-9]/.test(newPwd))         s++
    if (/[^A-Za-z0-9]/.test(newPwd)) s++
    return s
  })()
  const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Excellent'][strength]
  const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'][strength]

  const handlePwdSave = async () => {
    if (!currentPwd || !newPwd || newPwd !== confirmPwd) return
    setPwdLoading(true); setPwdErr(null)
    try {
      await apiFetch('/api/auth/password', token, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      setPwdSuccess(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setTimeout(() => setPwdSuccess(false), 3000)
    } catch (err) {
      setPwdErr(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setPwdLoading(false)
    }
  }

  const revokeSession = async (sessionId: string, isCurrent: boolean) => {
    await apiFetch(`/api/auth/sessions/${sessionId}`, token, { method: 'DELETE' })
    if (isCurrent) { logout(); navigate('/login', { replace: true }) }
    else qc.invalidateQueries({ queryKey: ['sessions'] })
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await apiFetch('/api/auth/account', token, { method: 'DELETE' })
      logout()
      navigate('/', { replace: true })
    } catch { setDeleting(false) }
  }

  const parseUA = (ua?: string | null) => {
    if (!ua) return 'Appareil inconnu'
    if (ua.includes('Chrome'))  return `Chrome · ${ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Android') ? 'Android' : 'Linux'}`
    if (ua.includes('Safari'))  return `Safari · ${ua.includes('iPhone') ? 'iPhone' : ua.includes('iPad') ? 'iPad' : 'macOS'}`
    if (ua.includes('Firefox')) return 'Firefox'
    return ua.slice(0, 30)
  }

  return (
    <div className="space-y-5">
      {/* Score sécurité */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2"><Shield size={18} className="text-emerald-400" /> Score de sécurité</h3>
            <p className="text-gray-400 text-sm mt-0.5">Protégez votre compte contre les accès non autorisés</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-emerald-400">72%</p>
            <p className="text-gray-500 text-xs">Bon</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-4">
          <div className="h-full rounded-full bg-emerald-400 w-[72%]" />
        </div>
        <div className="space-y-2">
          {[
            { label: 'E-mail vérifié',                done: true             },
            { label: 'Connexion sécurisée (JWT)',      done: true             },
            { label: 'Sessions actives vérifiées',     done: sessions.length > 0 },
            { label: 'Authentification 2FA',           done: false            },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.done ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> : <AlertCircle size={14} className="text-gray-500 shrink-0" />}
              <span className={item.done ? 'text-white' : 'text-gray-500'}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Changer mot de passe */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Lock size={15} className="text-blue-500" /> Changer le mot de passe</h3>
        {pwdSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm mb-4">
            <CheckCircle2 size={14} /> Mot de passe mis à jour avec succès.
          </div>
        )}
        {pwdErr && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm mb-4">
            <AlertCircle size={14} /> {pwdErr}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Mot de passe actuel</label>
            <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-gray-400 transition-colors overflow-hidden">
              <input type={showPwd ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                placeholder="••••••••" className="flex-1 px-4 py-3 text-sm focus:outline-none bg-white" />
              <button onClick={() => setShowPwd(v => !v)} className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Nouveau mot de passe</label>
            <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-gray-400 transition-colors overflow-hidden">
              <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="Minimum 8 caractères" className="flex-1 px-4 py-3 text-sm focus:outline-none bg-white" />
              <button onClick={() => setShowNew(v => !v)} className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPwd.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4].map(i => <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-gray-200'}`} />)}
                </div>
                <p className="text-[11px] text-gray-500">Force : <span className="font-semibold">{strengthLabel}</span></p>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Confirmer le nouveau mot de passe</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Répétez le mot de passe"
              className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors bg-white ${confirmPwd && confirmPwd !== newPwd ? 'border-red-300' : 'border-gray-200 focus:border-gray-400'}`} />
            {confirmPwd && confirmPwd !== newPwd && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />Les mots de passe ne correspondent pas</p>
            )}
          </div>
        </div>
        <button onClick={handlePwdSave} disabled={!currentPwd || !newPwd || newPwd !== confirmPwd || pwdLoading}
          className="mt-4 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {pwdLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          {pwdLoading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
        </button>
      </div>

      {/* Sessions actives */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Eye size={15} className="text-blue-500" /> Sessions actives</h3>
        {sessLoading ? (
          <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aucune session active</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((sess, i) => {
              const isCurrent = i === 0
              return (
                <div key={sess.id} className={`flex items-center justify-between p-3.5 rounded-xl border ${isCurrent ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{parseUA(sess.userAgent)}</p>
                      <p className="text-xs text-gray-400">
                        {sess.ipAddress ? `${sess.ipAddress} · ` : ''}
                        {new Date(sess.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {isCurrent
                    ? <span className="text-xs text-emerald-600 font-semibold bg-emerald-100 px-2 py-1 rounded-full">Actuelle</span>
                    : <button onClick={() => revokeSession(sess.id, false)} className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">Déconnecter</button>
                  }
                </div>
              )
            })}
          </div>
        )}
        {sessions.length > 1 && (
          <button onClick={() => revokeSession(sessions[0].id, true)}
            className="mt-3 text-xs text-gray-500 hover:text-red-500 transition-colors font-medium">
            Déconnecter toutes les autres sessions
          </button>
        )}
      </div>

      {/* Zone danger */}
      <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
        <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2"><AlertCircle size={15} /> Zone dangereuse</h3>
        <p className="text-xs text-red-600 mb-4">Ces actions sont irréversibles. Toutes vos données seront supprimées.</p>
        <button onClick={() => setShowDeleteModal(true)}
          className="w-full py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
          Supprimer définitivement mon compte
        </button>
      </div>

      {/* Modal suppression */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed z-50 inset-x-4 bottom-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Supprimer votre compte ?</h3>
                  <p className="text-sm text-gray-500 mt-1">Cette action est <strong>irréversible</strong>. Vos commandes, adresses et favoris seront supprimés définitivement.</p>
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors">
                    Annuler
                  </button>
                  <button onClick={handleDeleteAccount} disabled={deleting}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
                    {deleting ? 'Suppression…' : 'Supprimer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB — FIDÉLITÉ & CADEAUX
═══════════════════════════════════════════════════════════════ */
function TabFidelite() {
  const { token } = useAuth()
  const qc = useQueryClient()

  const { data: loyaltyData } = useQuery({
    queryKey: ['loyalty'],
    queryFn:  () => fetchLoyalty(token!),
    enabled:  !!token,
  })
  const { data: referralData } = useQuery({
    queryKey: ['referral'],
    queryFn:  () => fetchReferral(token!),
    enabled:  !!token,
  })
  const { data: listsData } = useQuery({
    queryKey: ['my-gift-lists'],
    queryFn:  () => fetchMyGiftLists(token!),
    enabled:  !!token,
  })

  const [newList, setNewList] = useState({ title: '', occasion: '' })
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  const points = loyaltyData?.data?.points ?? 0
  const code   = referralData?.data?.code ?? '…'
  const lists  = (listsData?.data?.lists ?? []) as { id: string; title: string; slug: string; items: unknown[] }[]

  const handleCopy = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateList = async () => {
    if (!newList.title || !token) return
    setCreating(true)
    try {
      await createGiftList(newList, token)
      qc.invalidateQueries({ queryKey: ['my-gift-lists'] })
      setNewList({ title: '', occasion: '' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Points */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <p className="text-sm font-semibold text-blue-200">Vos points Koli</p>
        <p className="text-4xl font-black mt-1">{points.toLocaleString('fr-FR')} pts</p>
        <p className="text-sm text-blue-200 mt-1">≈ {Math.floor(points * 0.5).toLocaleString('fr-FR')} FCFA de réduction disponibles</p>
        <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full" style={{ width: `${Math.min((points / 1000) * 100, 100)}%` }} />
        </div>
        <p className="text-xs text-blue-200 mt-1">Min. 500 pts pour utiliser vos points</p>
      </div>

      {/* Parrainage */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-1">🎁 Parrainez et gagnez</h3>
        <p className="text-xs text-gray-500 mb-4">Partagez votre code. Pour chaque ami inscrit, vous gagnez 200 pts bonus.</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 font-mono text-sm font-bold text-gray-900 border border-gray-200">
            {code}
          </div>
          <button onClick={handleCopy}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'}`}>
            {copied ? '✓ Copié !' : 'Copier'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">{referralData?.data?.referrals ?? 0} ami(s) parrainé(s)</p>
      </div>

      {/* Listes cadeaux */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">🎁 Mes listes de cadeaux</h3>
        <div className="space-y-2 mb-4">
          {lists.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">Aucune liste pour l'instant.</p>
            : lists.map(l => (
              <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{l.title}</p>
                  <p className="text-xs text-gray-400">{(l.items as unknown[]).length} produit(s)</p>
                </div>
                <a href={`/liste/${l.slug}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold">Voir →</a>
              </div>
            ))}
        </div>
        {/* Créer une liste */}
        <div className="space-y-2 pt-4 border-t border-gray-100">
          <input value={newList.title} onChange={e => setNewList(p => ({ ...p, title: e.target.value }))}
            placeholder="Titre de la liste (ex: Mon anniversaire)"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={newList.occasion} onChange={e => setNewList(p => ({ ...p, occasion: e.target.value }))}
            placeholder="Occasion (facultatif)"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={handleCreateList} disabled={!newList.title || creating}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {creating ? <><Loader2 size={14} className="animate-spin" /> Création…</> : '+ Créer une liste'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════════ */
export default function ProfilPage() {
  const navigate  = useNavigate()
  const { user, token, isAuthenticated, logout } = useAuth()
  const settings  = useSiteSettings()

  const [activeTab,     setActiveTab]     = useState<Tab>('profil')
  const [avatar,        setAvatar]        = useState('')
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true })
  }, [isAuthenticated, navigate])

  /* ── Profil complet ── */
  const { data: profile } = useQuery<FullProfile>({
    queryKey: ['me'],
    queryFn:  () => apiFetch<FullProfile>('/api/auth/me', token),
    enabled:  !!isAuthenticated,
  })

  /* ── Commandes ── */
  const { data: ordersData } = useQuery<{ orders: ApiOrder[] }>({
    queryKey: ['my-orders'],
    queryFn:  () => apiFetch<{ orders: ApiOrder[] }>('/api/orders', token),
    enabled:  !!isAuthenticated,
  })

  const orders: MappedOrder[] = (ordersData?.orders ?? []).map(o => ({
    id:        o.orderNumber,
    date:      new Date(o.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    status:    o.status,
    total:     o.total,
    itemCount: o.items?.length ?? 1,
    image:     o.items?.[0]?.image ?? '',
    label:     o.items?.[0]?.name  ?? 'Commande',
  }))

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    )
  }

  const fullName   = `${user.prenom} ${user.nom}`
  const loyaltyPts = Math.floor(orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0) / 1000)
  const unreadOrders = orders.filter(o => ['pending','confirmed'].includes(o.status)).length

  const TAB_CONTENT: Record<Tab, React.ReactNode> = {
    profil:        <TabProfil avatar={avatar} setAvatar={setAvatar} orders={orders} profile={profile} />,
    commandes:     <TabCommandes orders={orders} />,
    adresses:      <TabAdresses />,
    favoris:       <TabFavoris />,
    notifications: <TabNotifications initialNewsletter={profile.subscribedToNewsletter ?? true} />,
    securite:      <TabSecurite />,
    fidelite:      <TabFidelite />,
  }

  const currentLabel = SIDEBAR_ITEMS.find(s => s.tab === activeTab)?.label ?? ''

  return (
    <div className="min-h-screen bg-gray-50/70 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-600 transition-colors">Accueil</Link>
          <ChevronRight size={12} />
          <span className="text-gray-700 font-medium">Mon compte</span>
          {activeTab !== 'profil' && (
            <><ChevronRight size={12} /><span className="text-gray-700 font-medium">{currentLabel}</span></>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8 items-start">

          {/* ── SIDEBAR ── */}
          <div className="hidden lg:block sticky top-24 space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <Avatar src={user.avatar || avatar || undefined} name={fullName} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{fullName}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Award size={10} className="text-yellow-500" />
                  <span className="text-[10px] text-yellow-600 font-semibold">{loyaltyPts} points fidélité</span>
                </div>
              </div>
            </div>

            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {SIDEBAR_ITEMS.map((item, i) => (
                <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all ${
                    activeTab === item.tab ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                  <span className={activeTab === item.tab ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.tab === 'commandes' && unreadOrders > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === item.tab ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}`}>{unreadOrders}</span>
                  )}
                  {activeTab === item.tab && <ChevronRight size={13} className="text-gray-400" />}
                </button>
              ))}
              <div className="border-t border-gray-100">
                <button onClick={() => setLogoutConfirm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut size={17} className="text-red-400" />
                  Se déconnecter
                </button>
              </div>
            </nav>

            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
              <p className="text-xs font-bold text-blue-900 mb-1 flex items-center gap-1.5"><MessageCircle size={12} />Besoin d'aide ?</p>
              <p className="text-[11px] text-blue-700 mb-2">Notre équipe est disponible 7j/7 de 8h à 20h.</p>
              <a href={waLink(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors">
                WhatsApp <ExternalLink size={10} />
              </a>
            </div>
          </div>

          {/* ── CONTENU ── */}
          <div>
            <div className="lg:hidden overflow-x-auto pb-1 mb-5">
              <div className="flex gap-2 min-w-max">
                {SIDEBAR_ITEMS.map(item => (
                  <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      activeTab === item.tab ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    {item.icon}{item.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                {TAB_CONTENT[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Modal déconnexion */}
      <AnimatePresence>
        {logoutConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLogoutConfirm(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed z-50 inset-x-4 bottom-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                  <LogOut size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Se déconnecter ?</h3>
                  <p className="text-sm text-gray-500 mt-1">Vous devrez vous reconnecter pour accéder à votre compte.</p>
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setLogoutConfirm(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors">
                    Annuler
                  </button>
                  <button onClick={handleLogout}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                    Se déconnecter
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
