import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  User, Package, MapPin, Heart, Bell, Shield, LogOut,
  Edit2, Camera, Check, Copy, ChevronRight, Star,
  Truck, Clock, CheckCircle2, AlertCircle, Trash2,
  Plus, Eye, EyeOff, Smartphone, Mail, Phone,
  Award, TrendingUp, ShoppingBag, Gift,
  Lock, RefreshCw,
  Settings, MessageCircle, ExternalLink, X,
} from 'lucide-react'
import { PRODUCTS } from '../data/products'

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
type Tab = 'profil' | 'commandes' | 'adresses' | 'favoris' | 'notifications' | 'securite'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'

type FakeOrder = {
  id: string; date: string; status: OrderStatus
  total: number; itemCount: number; image: string; label: string
}

type Address = {
  id: string; label: string; prenom: string; nom: string
  telephone: string; ville: string; adresse: string; isDefault: boolean
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
const fmt = (n: number) =>
  (n / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' FCFA'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: 'En attente',     color: 'text-amber-700',   bg: 'bg-amber-50   border-amber-200',   dot: 'bg-amber-400'   },
  confirmed: { label: 'Confirmée',      color: 'text-blue-700',    bg: 'bg-blue-50    border-blue-200',     dot: 'bg-blue-500'    },
  preparing: { label: 'En préparation', color: 'text-violet-700',  bg: 'bg-violet-50  border-violet-200',   dot: 'bg-violet-500'  },
  shipped:   { label: 'Expédiée',       color: 'text-cyan-700',    bg: 'bg-cyan-50    border-cyan-200',     dot: 'bg-cyan-500'    },
  delivered: { label: 'Livrée',         color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200',  dot: 'bg-emerald-500' },
  cancelled: { label: 'Annulée',        color: 'text-red-700',     bg: 'bg-red-50     border-red-200',      dot: 'bg-red-400'     },
}

const FAKE_ORDERS: FakeOrder[] = [
  { id: 'KLI-20260512-0041', date: '12 mai 2026',    status: 'delivered', total: PRODUCTS[0].price + PRODUCTS[4].price * 2, itemCount: 3, image: PRODUCTS[0].images[0], label: PRODUCTS[0].name },
  { id: 'KLI-20260428-0029', date: '28 avril 2026',  status: 'shipped',   total: PRODUCTS[17].price,                        itemCount: 1, image: PRODUCTS[17].images[0], label: PRODUCTS[17].name },
  { id: 'KLI-20260310-0017', date: '10 mars 2026',   status: 'delivered', total: PRODUCTS[7].price,                         itemCount: 1, image: PRODUCTS[7].images[0],  label: PRODUCTS[7].name  },
  { id: 'KLI-20260215-0008', date: '15 fév. 2026',   status: 'cancelled', total: PRODUCTS[2].price * 2,                     itemCount: 2, image: PRODUCTS[2].images[0],  label: PRODUCTS[2].name  },
  { id: 'KLI-20260101-0001', date: '1 janv. 2026',   status: 'delivered', total: PRODUCTS[10].price,                        itemCount: 1, image: PRODUCTS[10].images[0], label: PRODUCTS[10].name },
]

const DEFAULT_ADDRESSES: Address[] = [
  { id: '1', label: 'Domicile', prenom: 'Kouamé', nom: 'Atta', telephone: '6 51 23 45 67', ville: 'Douala', adresse: 'Bonanjo, Rue des Bananiers, Immeuble Central 3e étage', isDefault: true  },
  { id: '2', label: 'Bureau',   prenom: 'Kouamé', nom: 'Atta', telephone: '6 51 23 45 67', ville: 'Yaoundé', adresse: 'Bastos, Avenue de l\'OUA, Bureau 12',                 isDefault: false },
]

const SIDEBAR_ITEMS: { tab: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
  { tab: 'profil',        icon: <User size={17} />,         label: 'Mon profil'       },
  { tab: 'commandes',     icon: <Package size={17} />,      label: 'Mes commandes',   badge: 1 },
  { tab: 'adresses',      icon: <MapPin size={17} />,       label: 'Mes adresses'     },
  { tab: 'favoris',       icon: <Heart size={17} />,        label: 'Mes favoris'      },
  { tab: 'notifications', icon: <Bell size={17} />,         label: 'Notifications'    },
  { tab: 'securite',      icon: <Shield size={17} />,       label: 'Sécurité'         },
]

/* ═══════════════════════════════════════════════════════════════
   AVATAR COMPONENT
═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   STATUS BADGE
═══════════════════════════════════════════════════════════════ */
function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB — PROFIL
═══════════════════════════════════════════════════════════════ */
function TabProfil({ avatar, setAvatar }: { avatar: string; setAvatar: (s: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [form, setForm] = useState({
    prenom: 'Kouamé', nom: 'Atta', email: 'kouame.atta@gmail.com',
    telephone: '+237 6 51 23 45 67', naissance: '1992-04-15', genre: 'Homme',
  })
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const totalSpent    = FAKE_ORDERS.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
  const loyaltyPts    = Math.floor(totalSpent / 100000)

  return (
    <div className="space-y-6">

      {/* Hero carte profil */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden p-6 text-white">
        {/* déco background */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-10 -translate-x-10" />

        <div className="relative flex items-center gap-5">
          <Avatar src={avatar || undefined} name={`${form.prenom} ${form.nom}`} size="xl" editable onChange={setAvatar} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-xl font-bold">{form.prenom} {form.nom}</h2>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 size={10} /> Vérifié
              </span>
            </div>
            <p className="text-gray-400 text-sm">{form.email}</p>
            <p className="text-gray-500 text-xs mt-0.5">{form.telephone}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Award size={13} className="text-yellow-400" />
              <span className="text-xs text-yellow-400 font-semibold">{loyaltyPts} points fidélité</span>
              <span className="text-gray-600 text-xs">· Membre depuis janv. 2024</span>
            </div>
          </div>
          <button onClick={() => setEditing(e => !e)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium">
            <Edit2 size={13} /> Modifier
          </button>
        </div>

        {/* Statistiques */}
        <div className="relative mt-5 grid grid-cols-3 gap-3">
          {[
            { icon: <ShoppingBag size={16} />, value: FAKE_ORDERS.length,   label: 'Commandes',       color: 'text-blue-400'    },
            { icon: <TrendingUp size={16} />,  value: fmt(totalSpent),       label: 'Total dépensé',   color: 'text-emerald-400' },
            { icon: <Gift size={16} />,        value: `${loyaltyPts} pts`,  label: 'Points fidélité', color: 'text-yellow-400'  },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl px-3 py-3 text-center border border-white/10">
              <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
              <p className="text-white font-bold text-sm leading-tight">{s.value}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire d'édition */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Edit2 size={15} className="text-blue-500" /> Modifier mes informations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { label: 'Prénom',    key: 'prenom',    type: 'text',  icon: <User size={14} /> },
                { label: 'Nom',       key: 'nom',       type: 'text',  icon: <User size={14} /> },
                { label: 'E-mail',    key: 'email',     type: 'email', icon: <Mail size={14} /> },
                { label: 'Téléphone', key: 'telephone', type: 'tel',   icon: <Phone size={14} /> },
                { label: 'Date de naissance', key: 'naissance', type: 'date', icon: null },
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
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Genre</label>
                <select value={form.genre} onChange={e => set('genre')(e.target.value)}
                  className="w-full px-3.5 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-white transition-colors">
                  <option>Homme</option><option>Femme</option><option>Autre</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditing(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <Check size={15} /> Enregistrer les modifications
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
              { icon: <User size={14} />,      label: 'Nom complet',       value: `${form.prenom} ${form.nom}` },
              { icon: <Mail size={14} />,      label: 'E-mail',            value: form.email },
              { icon: <Phone size={14} />,     label: 'Téléphone',         value: form.telephone },
              { icon: <Clock size={14} />,     label: 'Date de naissance', value: new Date(form.naissance).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) },
              { icon: <User size={14} />,      label: 'Genre',             value: form.genre },
              { icon: <Award size={14} />,     label: 'Statut fidélité',   value: loyaltyPts >= 100 ? '⭐ Gold' : loyaltyPts >= 50 ? '🥈 Silver' : '🥉 Bronze' },
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

      {/* Programme fidélité */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-yellow-500" />
            <span className="font-bold text-gray-900">Programme Fidélité Koli</span>
          </div>
          <span className="text-sm font-bold text-yellow-600 bg-yellow-100 px-2.5 py-1 rounded-full">
            {loyaltyPts} / 200 pts
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-yellow-100 overflow-hidden mb-2">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-400"
            initial={{ width: 0 }} animate={{ width: `${Math.min((loyaltyPts / 200) * 100, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }} />
        </div>
        <p className="text-xs text-gray-600">
          {200 - loyaltyPts > 0
            ? <>Plus que <strong>{200 - loyaltyPts} points</strong> pour passer au niveau Gold et débloquer des remises exclusives !</>
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
            }`}>
              {tier.label}
            </div>
          ))}
        </div>
      </div>

      {/* Commandes récentes en aperçu */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Package size={15} className="text-blue-500" /> Dernières commandes</h3>
          <button className="text-sm text-blue-600 font-semibold flex items-center gap-1">Tout voir <ChevronRight size={13} /></button>
        </div>
        <div className="space-y-3">
          {FAKE_ORDERS.slice(0, 3).map(o => (
            <Link key={o.id} to={`/commandes/${o.id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
              <img src={o.image} alt={o.label} className="w-12 h-12 rounded-xl object-cover bg-gray-50 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 font-mono">{o.id}</p>
                <p className="text-sm font-semibold text-gray-800 line-clamp-1">{o.label}</p>
              </div>
              <div className="text-right shrink-0">
                <StatusBadge status={o.status} />
                <p className="text-xs text-gray-400 mt-1">{o.date}</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB — COMMANDES
═══════════════════════════════════════════════════════════════ */
function TabCommandes() {
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const filtered = filter === 'all' ? FAKE_ORDERS : FAKE_ORDERS.filter(o => o.status === filter)

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { status: 'all',       label: 'Toutes',     count: FAKE_ORDERS.length,                                 icon: <Package size={16} />, color: 'text-gray-700 bg-gray-50 border-gray-200' },
          { status: 'shipped',   label: 'En cours',   count: FAKE_ORDERS.filter(o=>['shipped','preparing','confirmed'].includes(o.status)).length, icon: <Truck size={16} />, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { status: 'delivered', label: 'Livrées',    count: FAKE_ORDERS.filter(o=>o.status==='delivered').length, icon: <CheckCircle2 size={16} />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { status: 'cancelled', label: 'Annulées',   count: FAKE_ORDERS.filter(o=>o.status==='cancelled').length, icon: <X size={16} />, color: 'text-red-700 bg-red-50 border-red-200' },
        ].map(s => (
          <button key={s.status} onClick={() => setFilter(s.status as typeof filter)}
            className={`p-3 rounded-xl border text-left transition-all ${
              filter === s.status ? `${s.color} ring-2 ring-offset-1 ring-current/30 shadow-sm` : 'bg-white border-gray-100 hover:border-gray-200'
            }`}>
            <div className={`mb-1.5 ${filter === s.status ? '' : 'text-gray-400'}`}>{s.icon}</div>
            <p className="text-lg font-bold text-gray-900">{s.count}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Liste commandes */}
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
              {/* Header commande */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-gray-700">{order.id}</span>
                  <StatusBadge status={order.status} />
                </div>
                <span className="text-xs text-gray-400">{order.date}</span>
              </div>

              {/* Body */}
              <div className="flex items-center gap-4 p-5">
                <img src={order.image} alt={order.label}
                  className="w-16 h-16 rounded-xl object-cover bg-gray-50 shrink-0" />
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

              {/* Progress bar for active */}
              {(order.status === 'confirmed' || order.status === 'preparing' || order.status === 'shipped') && (
                <div className="px-5 pb-4">
                  <div className="flex items-center gap-1 mb-2">
                    {(['confirmed', 'preparing', 'shipped', 'delivered'] as const).map((s, i, arr) => {
                      const current = ['confirmed', 'preparing', 'shipped', 'delivered'].indexOf(order.status)
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
                    : order.status === 'preparing' ? 'En cours de préparation'
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
   TAB — ADRESSES
═══════════════════════════════════════════════════════════════ */
function TabAdresses() {
  const [addresses, setAddresses] = useState<Address[]>(DEFAULT_ADDRESSES)
  const [editing, setEditing]     = useState<Address | null>(null)
  const [adding,  setAdding]      = useState(false)

  const [form, setForm] = useState<Omit<Address, 'id' | 'isDefault'>>({
    label: '', prenom: '', nom: '', telephone: '', ville: '', adresse: '',
  })
  const setF = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (editing) {
      setAddresses(a => a.map(addr => addr.id === editing.id ? { ...addr, ...form } : addr))
    } else {
      setAddresses(a => [...a, { ...form, id: String(Date.now()), isDefault: a.length === 0 }])
    }
    setEditing(null); setAdding(false)
    setForm({ label: '', prenom: '', nom: '', telephone: '', ville: '', adresse: '' })
  }

  const startEdit = (a: Address) => {
    setForm({ label: a.label, prenom: a.prenom, nom: a.nom, telephone: a.telephone, ville: a.ville, adresse: a.adresse })
    setEditing(a); setAdding(false)
  }

  const remove = (id: string) => setAddresses(a => a.filter(addr => addr.id !== id))
  const setDefault = (id: string) => setAddresses(a => a.map(addr => ({ ...addr, isDefault: addr.id === id })))

  return (
    <div className="space-y-4">
      {/* Liste */}
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
            <p className="text-xs text-gray-500 mt-0.5">📍 {addr.adresse}, {addr.ville}</p>
            {!addr.isDefault && (
              <button onClick={() => setDefault(addr.id)}
                className="mt-3 text-xs text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Définir par défaut
              </button>
            )}
          </div>
        ))}

        {/* Ajouter */}
        <button onClick={() => { setAdding(true); setEditing(null); setForm({ label: '', prenom: '', nom: '', telephone: '', ville: '', adresse: '' }) }}
          className="flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 hover:border-gray-400 hover:bg-gray-50 transition-all min-h-[160px]">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><Plus size={18} className="text-gray-500" /></div>
          <p className="text-sm font-semibold text-gray-600">Ajouter une adresse</p>
        </button>
      </div>

      {/* Formulaire ajout/édition */}
      <AnimatePresence>
        {(adding || editing) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <MapPin size={15} className="text-blue-500" />
              {editing ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { label: 'Étiquette (Domicile, Bureau…)', key: 'label',     span: 2 },
                { label: 'Prénom',                        key: 'prenom',    span: 1 },
                { label: 'Nom',                           key: 'nom',       span: 1 },
                { label: 'Téléphone',                     key: 'telephone', span: 1 },
                { label: 'Ville',                         key: 'ville',     span: 1 },
                { label: 'Adresse complète',              key: 'adresse',   span: 2 },
              ] as const).map(f => (
                <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">{f.label}</label>
                  <input value={form[f.key]} onChange={e => setF(f.key)(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-white transition-colors" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setEditing(null); setAdding(false) }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <Check size={15} /> {editing ? 'Enregistrer' : 'Ajouter l\'adresse'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB — FAVORIS
═══════════════════════════════════════════════════════════════ */
function TabFavoris() {
  const [favorites, setFavorites] = useState<number[]>([
    PRODUCTS[0].id, PRODUCTS[3].id, PRODUCTS[7].id, PRODUCTS[11].id,
    PRODUCTS[15].id, PRODUCTS[19].id,
  ])
  const { useCart: _useCart } = { useCart: () => ({ addItem: (_: unknown) => {} }) } // placeholder, using inline
  const favProducts = PRODUCTS.filter(p => favorites.includes(p.id))
  const remove = (id: number) => setFavorites(f => f.filter(fid => fid !== id))

  if (favProducts.length === 0) {
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
        <p className="text-sm text-gray-500">{favProducts.length} article{favProducts.length > 1 ? 's' : ''} sauvegardé{favProducts.length > 1 ? 's' : ''}</p>
        <button onClick={() => setFavorites([])} className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">
          Tout supprimer
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {favProducts.map(p => {
          const disc = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                <Link to={`/catalogue/${p.id}`}>
                  <img src={p.images[0]} alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </Link>
                {disc > 0 && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-lg">-{disc}%</span>
                )}
                <button onClick={() => remove(p.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                  <X size={13} />
                </button>
              </div>
              <div className="p-3">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{p.brand}</p>
                <Link to={`/catalogue/${p.id}`}>
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2 mt-0.5 hover:text-blue-600 transition-colors leading-snug">{p.name}</p>
                </Link>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{(p.price / 100).toLocaleString('fr-FR')} FCFA</p>
                    {p.oldPrice && <p className="text-[10px] text-gray-400 line-through">{(p.oldPrice / 100).toLocaleString('fr-FR')} FCFA</p>}
                  </div>
                  <Link to={`/catalogue/${p.id}`}
                    className="text-[10px] font-bold bg-gray-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                    Voir
                  </Link>
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
   TAB — NOTIFICATIONS
═══════════════════════════════════════════════════════════════ */
type Notif = { id: string; label: string; desc: string; enabled: boolean; icon: React.ReactNode }

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-gray-900' : 'bg-gray-200'}`}>
      <motion.div animate={{ x: on ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md" />
    </button>
  )
}

function TabNotifications() {
  const [notifs, setNotifs] = useState<Notif[]>([
    { id: 'order',    label: 'Suivi de commande',     desc: 'Confirmation, expédition, livraison',           enabled: true,  icon: <Package size={16} /> },
    { id: 'promo',    label: 'Promotions et offres',  desc: 'Ventes flash, codes promo exclusifs',           enabled: true,  icon: <Gift size={16} /> },
    { id: 'stock',    label: 'Retour en stock',        desc: 'Alertes quand vos favoris sont disponibles',    enabled: false, icon: <Bell size={16} /> },
    { id: 'loyalty',  label: 'Programme fidélité',    desc: 'Points gagnés, paliers atteints',               enabled: true,  icon: <Award size={16} /> },
    { id: 'account',  label: 'Sécurité du compte',    desc: 'Connexion, changement de mot de passe',         enabled: true,  icon: <Shield size={16} /> },
    { id: 'newprod',  label: 'Nouveaux produits',      desc: 'Arrivages dans vos catégories préférées',       enabled: false, icon: <Star size={16} /> },
    { id: 'chat',     label: 'Messages SAV',           desc: 'Réponses du service client',                   enabled: true,  icon: <MessageCircle size={16} /> },
  ])
  const [channels, setChannels] = useState({ email: true, sms: true, push: false, whatsapp: true })

  const toggle = (id: string) =>
    setNotifs(n => n.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item))

  const toggleCh = (k: keyof typeof channels) =>
    setChannels(c => ({ ...c, [k]: !c[k] }))

  return (
    <div className="space-y-5">
      {/* Canaux */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Smartphone size={15} className="text-blue-500" /> Canaux de notification</h3>
        <div className="grid grid-cols-2 gap-3">
          {([
            { key: 'email',    label: 'E-mail',    icon: <Mail size={15} />,          color: 'text-blue-500'   },
            { key: 'sms',      label: 'SMS',       icon: <Phone size={15} />,         color: 'text-emerald-500'},
            { key: 'push',     label: 'Push web',  icon: <Bell size={15} />,          color: 'text-violet-500' },
            { key: 'whatsapp', label: 'WhatsApp',  icon: <MessageCircle size={15} />, color: 'text-green-500'  },
          ] as const).map(ch => (
            <div key={ch.key} className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${channels[ch.key] ? 'border-gray-900 bg-gray-50' : 'border-gray-100 bg-white'}`}>
              <div className="flex items-center gap-2.5">
                <span className={ch.color}>{ch.icon}</span>
                <span className="text-sm font-semibold text-gray-800">{ch.label}</span>
              </div>
              <Toggle on={channels[ch.key]} onClick={() => toggleCh(ch.key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Préférences */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Settings size={15} className="text-blue-500" /> Préférences de notification</h3>
        <div className="space-y-1">
          {notifs.map((n, i) => (
            <div key={n.id} className={`flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50 transition-colors ${i < notifs.length - 1 ? '' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${n.enabled ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {n.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{n.label}</p>
                  <p className="text-xs text-gray-400">{n.desc}</p>
                </div>
              </div>
              <Toggle on={n.enabled} onClick={() => toggle(n.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* Fréquence */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock size={15} className="text-blue-500" /> Fréquence des e-mails promotionnels</h3>
        <div className="space-y-2">
          {[
            { id: 'instant',  label: 'En temps réel',    desc: 'Dès qu\'une offre est disponible' },
            { id: 'daily',    label: 'Résumé quotidien', desc: 'Un email par jour avec les meilleures offres' },
            { id: 'weekly',   label: 'Résumé hebdo',     desc: 'Un email par semaine' },
            { id: 'never',    label: 'Jamais',           desc: 'Aucun e-mail promotionnel' },
          ].map(opt => {
            const active = opt.id === 'daily'
            return (
              <button key={opt.id} className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${active ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-gray-900 bg-gray-900' : 'border-gray-300'}`}>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB — SÉCURITÉ
═══════════════════════════════════════════════════════════════ */
function TabSecurite() {
  const [showPwd,      setShowPwd]      = useState(false)
  const [showNewPwd,   setShowNewPwd]   = useState(false)
  const [currentPwd,   setCurrentPwd]   = useState('')
  const [newPwd,       setNewPwd]       = useState('')
  const [confirmPwd,   setConfirmPwd]   = useState('')
  const [pwdSuccess,   setPwdSuccess]   = useState(false)
  const [twoFa,        setTwoFa]        = useState(false)
  const [copied,       setCopied]       = useState(false)

  const strength = (() => {
    if (newPwd.length === 0) return 0
    let s = 0
    if (newPwd.length >= 8)              s++
    if (/[A-Z]/.test(newPwd))           s++
    if (/[0-9]/.test(newPwd))           s++
    if (/[^A-Za-z0-9]/.test(newPwd))   s++
    return s
  })()

  const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Excellent'][strength]
  const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'][strength]

  const handlePwdSave = () => {
    if (!currentPwd || !newPwd || newPwd !== confirmPwd) return
    setPwdSuccess(true)
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    setTimeout(() => setPwdSuccess(false), 3000)
  }

  const copySession = () => {
    navigator.clipboard.writeText('Sess-koli-2024-xyz789')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
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
            { label: 'Mot de passe fort',         done: true  },
            { label: 'Authentification 2FA',       done: twoFa },
            { label: 'E-mail vérifié',             done: true  },
            { label: 'Téléphone vérifié',          done: true  },
            { label: 'Connexions récentes vérifiées', done: false },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.done
                ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                : <AlertCircle size={14} className="text-gray-500 shrink-0" />}
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
        <div className="space-y-3">
          {/* Mot de passe actuel */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Mot de passe actuel</label>
            <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-gray-400 transition-colors overflow-hidden">
              <input type={showPwd ? 'text' : 'password'} value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="flex-1 px-4 py-3 text-sm focus:outline-none bg-white" />
              <button onClick={() => setShowPwd(v => !v)} className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Nouveau */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Nouveau mot de passe</label>
            <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-gray-400 transition-colors overflow-hidden">
              <input type={showNewPwd ? 'text' : 'password'} value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Minimum 8 caractères"
                className="flex-1 px-4 py-3 text-sm focus:outline-none bg-white" />
              <button onClick={() => setShowNewPwd(v => !v)} className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors">
                {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPwd.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-gray-200'}`} />
                  ))}
                </div>
                <p className="text-[11px] text-gray-500">Force : <span className="font-semibold">{strengthLabel}</span></p>
              </div>
            )}
          </div>

          {/* Confirmer */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Confirmer le nouveau mot de passe</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Répétez le mot de passe"
              className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors bg-white ${
                confirmPwd && confirmPwd !== newPwd ? 'border-red-300' : 'border-gray-200 focus:border-gray-400'
              }`} />
            {confirmPwd && confirmPwd !== newPwd && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />Les mots de passe ne correspondent pas</p>
            )}
          </div>
        </div>
        <button onClick={handlePwdSave} disabled={!currentPwd || !newPwd || newPwd !== confirmPwd}
          className="mt-4 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          <Lock size={14} /> Mettre à jour le mot de passe
        </button>
      </div>

      {/* 2FA */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Smartphone size={15} className="text-blue-500" />
            <div>
              <h3 className="font-bold text-gray-900">Authentification à 2 facteurs (2FA)</h3>
              <p className="text-xs text-gray-500">Sécurisez votre compte avec un code SMS à chaque connexion</p>
            </div>
          </div>
          <Toggle on={twoFa} onClick={() => setTwoFa(v => !v)} />
        </div>
        {twoFa && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 flex items-start gap-2">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
            <p>La 2FA est activée. Un code SMS sera envoyé à <strong>+237 6 51 23 45 67</strong> lors de chaque connexion.</p>
          </motion.div>
        )}
      </div>

      {/* Sessions actives */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Eye size={15} className="text-blue-500" /> Sessions actives</h3>
        <div className="space-y-3">
          {[
            { device: 'Chrome · MacOS', location: 'Douala, CM', time: 'Maintenant', current: true },
            { device: 'Safari · iPhone', location: 'Douala, CM', time: 'Il y a 2h', current: false },
            { device: 'Chrome · Windows', location: 'Yaoundé, CM', time: 'Hier 18:42', current: false },
          ].map((sess, i) => (
            <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border ${sess.current ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${sess.current ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{sess.device}</p>
                  <p className="text-xs text-gray-400">{sess.location} · {sess.time}</p>
                </div>
              </div>
              {sess.current
                ? <span className="text-xs text-emerald-600 font-semibold bg-emerald-100 px-2 py-1 rounded-full">Actuelle</span>
                : <button className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">Déconnecter</button>
              }
            </div>
          ))}
        </div>
        <button onClick={copySession}
          className="mt-3 flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors">
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          Copier l'ID de session
        </button>
      </div>

      {/* Zone danger */}
      <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
        <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2"><AlertCircle size={15} /> Zone dangereuse</h3>
        <p className="text-xs text-red-600 mb-4">Ces actions sont irréversibles. Assurez-vous d'avoir sauvegardé vos données avant de continuer.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors">
            Désactiver le compte
          </button>
          <button className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
            Supprimer définitivement
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
  const [activeTab, setActiveTab] = useState<Tab>('profil')
  const [avatar,    setAvatar]    = useState('')
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  const TAB_CONTENT: Record<Tab, React.ReactNode> = {
    profil:        <TabProfil avatar={avatar} setAvatar={setAvatar} />,
    commandes:     <TabCommandes />,
    adresses:      <TabAdresses />,
    favoris:       <TabFavoris />,
    notifications: <TabNotifications />,
    securite:      <TabSecurite />,
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
            <>
              <ChevronRight size={12} />
              <span className="text-gray-700 font-medium">{currentLabel}</span>
            </>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8 items-start">

          {/* ── SIDEBAR ── */}
          <div className="hidden lg:block sticky top-24 space-y-3">
            {/* Mini profil */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <Avatar src={avatar || undefined} name="Kouamé Atta" size="md" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">Kouamé Atta</p>
                <p className="text-xs text-gray-400 truncate">kouame.atta@gmail.com</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Award size={10} className="text-yellow-500" />
                  <span className="text-[10px] text-yellow-600 font-semibold">142 points fidélité</span>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {SIDEBAR_ITEMS.map((item, i) => (
                <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all ${
                    activeTab === item.tab
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                  <span className={activeTab === item.tab ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === item.tab ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                  {activeTab === item.tab && <ChevronRight size={13} className="text-gray-400" />}
                </button>
              ))}

              {/* Déconnexion */}
              <div className="border-t border-gray-100">
                <button onClick={() => setLogoutConfirm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut size={17} className="text-red-400" />
                  Se déconnecter
                </button>
              </div>
            </nav>

            {/* Aide */}
            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
              <p className="text-xs font-bold text-blue-900 mb-1 flex items-center gap-1.5"><MessageCircle size={12} />Besoin d'aide ?</p>
              <p className="text-[11px] text-blue-700 mb-2">Notre équipe est disponible 7j/7 de 8h à 20h.</p>
              <a href="https://wa.me/237600000000" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors">
                WhatsApp <ExternalLink size={10} />
              </a>
            </div>
          </div>

          {/* ── CONTENU ── */}
          <div>
            {/* Tab bar mobile */}
            <div className="lg:hidden overflow-x-auto pb-1 mb-5">
              <div className="flex gap-2 min-w-max">
                {SIDEBAR_ITEMS.map(item => (
                  <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      activeTab === item.tab ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    {item.icon}
                    {item.label}
                    {item.badge && item.badge > 0 && (
                      <span className={`text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${activeTab === item.tab ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu onglet */}
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
                  <Link to="/login"
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors text-center">
                    Se déconnecter
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
