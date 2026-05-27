import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  MessageCircle, Mail, Phone, MapPin, Clock,
  Send, CheckCircle2, ChevronDown, ChevronRight,
  Paperclip, AlertCircle, Zap, Shield, Package,
  RotateCcw, Star, Headphones, X,
} from 'lucide-react'
import { PageMeta } from '../components/seo/PageMeta'

/* ═══════════════════════════════════════════════════════════════
   DONNÉES
═══════════════════════════════════════════════════════════════ */
const SUBJECTS = [
  { value: '',            label: 'Choisissez un sujet…' },
  { value: 'commande',    label: '📦 Problème avec une commande' },
  { value: 'livraison',   label: '🚚 Suivi de livraison' },
  { value: 'retour',      label: '↩️  Retour / Remboursement' },
  { value: 'produit',     label: '🔍 Question produit' },
  { value: 'paiement',    label: '💳 Problème de paiement' },
  { value: 'partenariat', label: '🤝 Partenariat / Fournisseur' },
  { value: 'autre',       label: '💬 Autre demande' },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Quel est le délai de livraison ?',
    a: 'En livraison standard, comptez 3 à 5 jours ouvrés. En express, 24 à 48h. Vous recevez un SMS de suivi dès l\'expédition de votre colis.',
  },
  {
    q: 'Comment retourner un produit ?',
    a: 'Vous disposez de 30 jours après réception pour retourner un article. Il suffit de nous contacter via WhatsApp ou email avec votre numéro de commande.',
  },
  {
    q: 'Quels modes de paiement acceptez-vous ?',
    a: 'Nous acceptons Orange Money, Wave, MTN Mobile Money et le paiement cash à la livraison. Aucune carte bancaire requise.',
  },
  {
    q: 'Comment suivre ma commande ?',
    a: 'Accédez à votre espace "Mes commandes" depuis votre profil ou utilisez directement le numéro de commande reçu par SMS.',
  },
  {
    q: 'Les produits sont-ils garantis ?',
    a: 'Oui, tous nos produits bénéficient d\'une garantie constructeur et d\'un service après-vente dédié joignable 7j/7 via WhatsApp.',
  },
  {
    q: 'Livrez-vous partout au Cameroun ?',
    a: 'Nous livrons dans toutes les grandes villes : Douala, Yaoundé, Bafoussam, Bamenda, Garoua, et bien d\'autres. Contactez-nous pour les zones rurales.',
  },
]

/* ═══════════════════════════════════════════════════════════════
   COMPOSANT FAQ
═══════════════════════════════════════════════════════════════ */
function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${open ? 'border-gray-300 bg-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-sm font-semibold text-gray-900">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="text-gray-400 shrink-0">
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            className="overflow-hidden">
            <p className="px-5 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════════ */
export function ContactPage() {
  /* ── Form state ── */
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    sujet: '', message: '', rgpd: false,
  })
  const [errors,   setErrors]   = useState<Partial<Record<keyof typeof form, string>>>({})
  const [file,     setFile]     = useState<File | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  const set = (k: keyof typeof form) => (v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e: typeof errors = {}
    if (!form.prenom.trim())  e.prenom  = 'Requis'
    if (!form.nom.trim())     e.nom     = 'Requis'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'E-mail invalide'
    if (!form.sujet)          e.sujet   = 'Choisissez un sujet'
    if (form.message.trim().length < 20) e.message = 'Minimum 20 caractères'
    if (!form.rgpd)           e.rgpd    = 'Vous devez accepter pour continuer'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1800))
    setLoading(false)
    setSuccess(true)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && f.size <= 5 * 1024 * 1024) setFile(f)
  }

  const charCount = form.message.length

  /* ── SUCCÈS ── */
  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md w-full text-center space-y-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 18 }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mx-auto flex items-center justify-center shadow-2xl shadow-emerald-400/30">
            <CheckCircle2 size={44} className="text-white" strokeWidth={1.5} />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Message envoyé !</h2>
            <p className="text-gray-500 mt-2 leading-relaxed">
              Merci <strong>{form.prenom}</strong> ! Notre équipe vous répondra sous <strong>24h</strong> à l'adresse <strong>{form.email}</strong>.
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 text-left space-y-2 border border-gray-100">
            <p className="font-semibold text-gray-800">En attendant, vous pouvez :</p>
            <div className="flex items-center gap-2"><Package size={14} className="text-blue-500 shrink-0" /><span>Suivre votre commande dans votre espace client</span></div>
            <div className="flex items-center gap-2"><MessageCircle size={14} className="text-emerald-500 shrink-0" /><span>Nous contacter directement via WhatsApp</span></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/"
              className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors">
              Retour à l'accueil
            </Link>
            <a href="https://wa.me/237600000000" target="_blank" rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
              <MessageCircle size={15} /> WhatsApp SAV
            </a>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <PageMeta
        title="Contact — Koli"
        description="Une question, un retour, un partenariat ? L'équipe Koli vous répond sous 24h. WhatsApp, email ou formulaire de contact."
        path="/contact"
      />

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
        {/* déco */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-600/10 -translate-y-32 translate-x-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-emerald-600/10 translate-y-20 -translate-x-20 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Headphones size={16} className="text-blue-400" />
              <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest">Support client</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-4">
              Comment pouvons-nous<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                vous aider ?
              </span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-xl">
              Notre équipe est disponible 7 jours sur 7 pour répondre à toutes vos questions sur vos commandes, produits et livraisons.
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-3 mt-6">
              {[
                { icon: <Zap size={13} />,    label: 'Réponse sous 24h'      },
                { icon: <Shield size={13} />, label: 'Données protégées'     },
                { icon: <Star size={13} />,   label: '4.9/5 satisfaction'    },
              ].map(b => (
                <span key={b.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-xs font-medium text-gray-300">
                  <span className="text-blue-400">{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CANAUX DE CONTACT ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <MessageCircle size={22} className="text-emerald-600" />,
                bg:   'bg-emerald-50 border-emerald-100',
                title: 'WhatsApp',
                desc: 'Réponse instantanée',
                action: 'Démarrer une conversation',
                href: 'https://wa.me/237600000000',
                badge: 'Le + rapide',
                badgeColor: 'bg-emerald-500',
              },
              {
                icon: <Phone size={22} className="text-blue-600" />,
                bg:   'bg-blue-50 border-blue-100',
                title: 'Téléphone',
                desc: 'Lun–Sam · 8h–20h',
                action: '+237 600 00 00 00',
                href: 'tel:+237600000000',
                badge: null,
                badgeColor: '',
              },
              {
                icon: <Mail size={22} className="text-violet-600" />,
                bg:   'bg-violet-50 border-violet-100',
                title: 'E-mail',
                desc: 'Réponse sous 24h',
                action: 'support@koli.cm',
                href: 'mailto:support@koli.cm',
                badge: null,
                badgeColor: '',
              },
              {
                icon: <MapPin size={22} className="text-orange-600" />,
                bg:   'bg-orange-50 border-orange-100',
                title: 'Agence',
                desc: 'Douala, Bonanjo',
                action: 'Voir sur la carte',
                href: '#localisation',
                badge: null,
                badgeColor: '',
              },
            ].map(card => (
              <a key={card.title} href={card.href}
                target={card.href.startsWith('http') ? '_blank' : undefined}
                rel={card.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={`relative flex flex-col gap-3 p-4 sm:p-5 rounded-2xl border-2 hover:shadow-md transition-all group ${card.bg}`}>
                {card.badge && (
                  <span className={`absolute top-3 right-3 text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  {card.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{card.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.desc}</p>
                </div>
                <p className="text-xs font-semibold text-gray-700 flex items-center gap-1 mt-auto group-hover:gap-2 transition-all">
                  {card.action} <ChevronRight size={11} />
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CORPS PRINCIPAL : FORMULAIRE + INFOS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-12 items-start">

          {/* ─── FORMULAIRE ─── */}
          <div>
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-gray-900">Envoyez-nous un message</h2>
              <p className="text-gray-500 text-sm mt-1">Remplissez le formulaire ci-dessous, notre équipe vous répondra rapidement.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              {/* Prénom + Nom */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Prénom" error={errors.prenom}>
                  <input value={form.prenom} onChange={e => set('prenom')(e.target.value)}
                    placeholder="Jean"
                    className={fieldCls(!!errors.prenom)} />
                </FormField>
                <FormField label="Nom" error={errors.nom}>
                  <input value={form.nom} onChange={e => set('nom')(e.target.value)}
                    placeholder="Dupont"
                    className={fieldCls(!!errors.nom)} />
                </FormField>
              </div>

              {/* Email + Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Adresse e-mail" error={errors.email}>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="email" value={form.email} onChange={e => set('email')(e.target.value)}
                      placeholder="votre@email.com"
                      className={`${fieldCls(!!errors.email)} pl-9`} />
                  </div>
                </FormField>
                <FormField label="Téléphone" required={false}>
                  <div className="flex items-center rounded-xl border-2 border-gray-200 focus-within:border-gray-400 transition-colors overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 py-3 bg-gray-50 border-r border-gray-200 shrink-0">
                      <span className="text-base">🇨🇲</span>
                      <span className="text-xs font-semibold text-gray-600">+237</span>
                    </div>
                    <input type="tel" value={form.telephone} onChange={e => set('telephone')(e.target.value)}
                      placeholder="6XX XXX XXX"
                      className="flex-1 px-3 py-3 text-sm focus:outline-none bg-white placeholder:text-gray-300" />
                  </div>
                </FormField>
              </div>

              {/* Sujet */}
              <FormField label="Sujet de votre demande" error={errors.sujet}>
                <div className="relative">
                  <select value={form.sujet} onChange={e => set('sujet')(e.target.value)}
                    className={`${fieldCls(!!errors.sujet)} appearance-none pr-9 ${!form.sujet ? 'text-gray-300' : 'text-gray-800'}`}>
                    {SUBJECTS.map(s => (
                      <option key={s.value} value={s.value} disabled={s.value === ''}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </FormField>

              {/* Message */}
              <FormField label="Votre message" error={errors.message}>
                <div className="relative">
                  <textarea rows={6} value={form.message}
                    onChange={e => set('message')(e.target.value)}
                    placeholder="Décrivez votre demande en détail. Plus vous êtes précis, plus nous pourrons vous aider efficacement…"
                    className={`${fieldCls(!!errors.message)} resize-none`} />
                  <span className={`absolute bottom-3 right-3 text-[10px] font-medium tabular-nums ${
                    charCount > 1000 ? 'text-red-400' : charCount > 800 ? 'text-orange-400' : 'text-gray-300'
                  }`}>
                    {charCount}/1000
                  </span>
                </div>
              </FormField>

              {/* Pièce jointe */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Pièce jointe <span className="text-gray-400 font-normal">(optionnel · max 5 Mo)</span>
                </label>
                <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-400 bg-white'
                }`}>
                  <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFile} className="hidden" />
                  {file ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      <span className="text-sm font-medium text-emerald-700 flex-1 truncate">{file.name}</span>
                      <button type="button" onClick={e => { e.preventDefault(); setFile(null) }}
                        className="text-gray-400 hover:text-red-400 transition-colors shrink-0">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <Paperclip size={16} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-500">Ajouter une capture d'écran ou un document…</span>
                    </>
                  )}
                </label>
              </div>

              {/* RGPD */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${
                    form.rgpd ? 'bg-gray-900 border-gray-900' : errors.rgpd ? 'border-red-300' : 'border-gray-300 group-hover:border-gray-400'
                  }`}
                    onClick={() => set('rgpd')(!form.rgpd)}>
                    {form.rgpd && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-xs text-gray-500 leading-relaxed">
                    J'accepte que mes données soient traitées par Koli afin de répondre à ma demande, conformément à la{' '}
                    <Link to="/privacy" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">
                      politique de confidentialité
                    </Link>.
                    Vous pouvez exercer vos droits à tout moment en écrivant à{' '}
                    <a href="mailto:dpo@koli.cm" className="text-blue-600 underline underline-offset-2">dpo@koli.cm</a>.
                  </span>
                </label>
                {errors.rgpd && (
                  <p className="text-red-400 text-[11px] mt-1.5 flex items-center gap-1">
                    <AlertCircle size={10} /> {errors.rgpd}
                  </p>
                )}
              </div>

              {/* Bouton submit */}
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2.5 hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-gray-900/10">
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Envoi en cours…
                  </>
                ) : (
                  <>
                    <Send size={16} /> Envoyer le message
                  </>
                )}
              </button>

              {/* Temps de réponse estimé */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Clock size={12} />
                Temps de réponse moyen : <strong className="text-gray-600">moins de 4h en semaine</strong>
              </div>
            </form>
          </div>

          {/* ─── SIDEBAR INFOS ─── */}
          <div className="mt-10 lg:mt-0 space-y-5">

            {/* Horaires */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-3.5 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2"><Clock size={14} className="text-blue-500" /> Heures d'ouverture</p>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                {[
                  { day: 'Lundi – Vendredi', hours: '8h00 – 20h00', open: true  },
                  { day: 'Samedi',           hours: '9h00 – 18h00', open: true  },
                  { day: 'Dimanche',         hours: '10h00 – 16h00', open: true },
                ].map(({ day, hours, open }) => (
                  <div key={day} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">{day}</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <span className={`font-semibold ${open ? 'text-gray-800' : 'text-gray-400'}`}>{hours}</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <Zap size={11} /> WhatsApp disponible 7j/7 jusqu'à 22h
                </div>
              </div>
            </div>

            {/* Infos contact */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-sm font-bold text-gray-900">Coordonnées directes</p>
              {[
                { icon: <Phone size={15} className="text-blue-500" />,          label: 'Téléphone', value: '+237 600 00 00 00', href: 'tel:+237600000000'         },
                { icon: <Mail size={15} className="text-violet-500" />,         label: 'E-mail SAV', value: 'support@koli.cm', href: 'mailto:support@koli.cm'     },
                { icon: <Mail size={15} className="text-orange-400" />,         label: 'E-mail pro', value: 'pro@koli.cm',     href: 'mailto:pro@koli.cm'         },
                { icon: <MapPin size={15} className="text-red-400" />,          label: 'Adresse',   value: 'Bonanjo, Douala · Cameroun', href: '#localisation'    },
              ].map(item => (
                <a key={item.label} href={item.href}
                  className="flex items-start gap-3 group hover:bg-gray-50 -mx-1 px-1 py-1.5 rounded-xl transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-white transition-colors border border-gray-100">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900 transition-colors">{item.value}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <a href="https://wa.me/237600000000?text=Bonjour%20Koli%2C%20j'ai%20une%20question%20concernant…"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/20 group">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <MessageCircle size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-base">Contacter via WhatsApp</p>
                <p className="text-emerald-100 text-xs mt-0.5">En ligne maintenant · Réponse instantanée</p>
              </div>
              <ChevronRight size={18} className="text-white/60 group-hover:translate-x-1 transition-transform" />
            </a>

            {/* Localisation */}
            <div id="localisation" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Fake map */}
              <div className="relative h-44 bg-gradient-to-br from-blue-100 via-gray-100 to-emerald-100 overflow-hidden">
                {/* Grid lignes de rue */}
                <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                  {[0,1,2,3,4].map(i => <line key={`h${i}`} x1="0" y1={`${i*25}%`} x2="100%" y2={`${i*25}%`} stroke="#64748b" strokeWidth="1"/>)}
                  {[0,1,2,3,4,5].map(i => <line key={`v${i}`} x1={`${i*20}%`} y1="0" x2={`${i*20}%`} y2="100%" stroke="#64748b" strokeWidth="1"/>)}
                </svg>
                {/* Pin */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center shadow-xl">
                      <MapPin size={18} className="text-white" />
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-gray-900 rotate-45" />
                  </div>
                </div>
                {/* Label */}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-sm">
                  <p className="text-xs font-bold text-gray-900">Koli HQ · Bonanjo</p>
                  <p className="text-[10px] text-gray-500">Douala, Cameroun</p>
                </div>
                <a href="https://maps.google.com/?q=Bonanjo,Douala,Cameroun" target="_blank" rel="noopener noreferrer"
                  className="absolute top-3 right-3 bg-white rounded-lg px-2.5 py-1.5 shadow-sm text-[10px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1">
                  Ouvrir <ChevronRight size={9} />
                </a>
              </div>
              <div className="px-4 py-3.5">
                <p className="text-sm font-bold text-gray-900">Koli Commerce SAS</p>
                <p className="text-xs text-gray-500 mt-0.5">Rue du Commerce, Quartier Bonanjo<br />Douala, Cameroun · BP 12345</p>
              </div>
            </div>

            {/* Stats satisfaction */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 grid grid-cols-3 gap-3 text-center">
              {[
                { value: '< 4h',  label: 'Temps de réponse', color: 'text-blue-600'    },
                { value: '4.9★', label: 'Satisfaction',      color: 'text-yellow-500'  },
                { value: '98%',   label: 'Résolution',        color: 'text-emerald-600' },
              ].map(s => (
                <div key={s.label}>
                  <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-gray-50 border-t border-gray-100 py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">FAQ</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">Questions fréquentes</h2>
            <p className="text-gray-500 text-sm mt-2">Trouvez rapidement une réponse à votre question.</p>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} defaultOpen={i === 0} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">Vous n'avez pas trouvé de réponse ?</p>
            <a href="https://wa.me/237600000000" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors">
              <MessageCircle size={14} /> Contactez-nous sur WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── AUTRES RESSOURCES ── */}
      <section className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6 text-center">Ressources utiles</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: <Package size={20} className="text-blue-500" />,    title: 'Mes commandes',  desc: 'Suivez vos livraisons',       href: '/commandes',  bg: 'bg-blue-50   border-blue-100'   },
              { icon: <RotateCcw size={20} className="text-orange-500" />, title: 'Retours',        desc: 'Retourner un article',        href: '/contact',    bg: 'bg-orange-50 border-orange-100' },
              { icon: <Shield size={20} className="text-emerald-500" />,  title: 'Garanties',      desc: 'Politique de garantie',       href: '/cgu',        bg: 'bg-emerald-50 border-emerald-100' },
              { icon: <Star size={20} className="text-yellow-500" />,     title: 'Partenariat',    desc: 'Devenir vendeur Koli',        href: '/contact',    bg: 'bg-yellow-50 border-yellow-100' },
            ].map(card => (
              <Link key={card.title} to={card.href}
                className={`flex flex-col items-center text-center gap-3 p-5 rounded-2xl border hover:shadow-md transition-all ${card.bg}`}>
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-white/80">
                  {card.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{card.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.desc}</p>
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

/* ─── helpers ─── */
function fieldCls(err: boolean) {
  return `w-full px-4 py-3 rounded-xl border-2 text-sm bg-white placeholder:text-gray-300 focus:outline-none transition-colors ${
    err ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-gray-400'
  }`
}

function FormField({ label, error, required = true, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  )
}

// Named export for Check icon used in form
const Check = ({ size, className, strokeWidth }: { size: number; className?: string; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 16 4 11" />
  </svg>
)
