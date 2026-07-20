import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Save, Bell, Send, AlertTriangle, Phone, Mail, X, Plus, Download, Archive } from 'lucide-react'
import { api } from '../lib/api'
import { AxiosError } from 'axios'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { PageTitle } from '../components/layout/Sidebar'

type ApiErrorBody = { message?: string; errors?: Record<string, string[]> }

function apiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiErrorBody | undefined
    if (body?.errors) {
      const first = Object.values(body.errors)[0]?.[0]
      if (first) return first
    }
    if (body?.message) return body.message
  }
  return 'Une erreur est survenue'
}

type SiteSettings = {
  supportPhone:   string
  whatsappNumber: string
  supportEmail:   string
  contactEmail:   string
  address:        string
  facebookUrl?:   string
  instagramUrl?:  string
  youtubeUrl?:    string
  tiktokUrl?:     string
  orderNotifyEmails?: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [notifMsg, setNotifMsg]       = useState('')
  const [notifTitle, setNotifTitle]   = useState('')
  const [notifSuccess, setNotifSuccess] = useState(false)
  const [siteSuccess, setSiteSuccess] = useState(false)

  const { register, handleSubmit } = useForm({
    defaultValues: { prenom: user?.prenom, nom: user?.nom, email: user?.email },
  })

  const profileMutation = useMutation({
    mutationFn: (body: object) => api.put('/api/auth/me', body),
  })

  /* Coordonnées & réseaux sociaux du site public — vue admin complète (inclut orderNotifyEmails,
     jamais exposé sur le endpoint public consommé par le site client) */
  const { data: siteSettings, isLoading: loadingSite } = useQuery({
    queryKey: ['site-settings-admin'],
    queryFn: async () => { const { data } = await api.get('/api/settings/admin'); return data.data.settings as SiteSettings },
  })

  const { register: registerSite, handleSubmit: handleSubmitSite, reset: resetSite } = useForm<SiteSettings>()

  useEffect(() => {
    if (siteSettings) resetSite(siteSettings)
  }, [siteSettings, resetSite])

  const siteMutation = useMutation({
    mutationFn: (body: Partial<SiteSettings>) => api.put('/api/settings', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-settings-admin'] })
      setSiteSuccess(true)
      setTimeout(() => setSiteSuccess(false), 3000)
    },
  })

  /* Destinataires des emails "nouvelle commande" */
  const [newNotifyEmail, setNewNotifyEmail] = useState('')
  const notifyEmails = (siteSettings?.orderNotifyEmails ?? '').split(',').map(e => e.trim()).filter(Boolean)

  const addNotifyEmail = () => {
    const email = newNotifyEmail.trim()
    if (!email || notifyEmails.includes(email)) return
    siteMutation.mutate({ orderNotifyEmails: [...notifyEmails, email].join(', ') })
    setNewNotifyEmail('')
  }
  const removeNotifyEmail = (email: string) => {
    siteMutation.mutate({ orderNotifyEmails: notifyEmails.filter(e => e !== email).join(', ') })
  }

  const broadcastMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/notifications/broadcast', body),
    onSuccess: () => { setNotifSuccess(true); setNotifMsg(''); setNotifTitle(''); setTimeout(() => setNotifSuccess(false), 3000) },
  })

  const exportImagesMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get('/api/settings/images-export', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `skignas-images-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    },
  })

  const cardCls = "bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"

  return (
    <div className="space-y-6 max-w-3xl">
      <PageTitle title="Paramètres" sub="Gestion du compte administrateur" />

      {/* Profil */}
      <div className={cardCls}>
        <h2 className="text-sm font-semibold text-slate-900 mb-5">Profil administrateur</h2>
        <form onSubmit={handleSubmit(d => profileMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Prénom" {...register('prenom')} />
            <Input label="Nom" {...register('nom')} />
          </div>
          <Input label="Email" {...register('email')} type="email" />
          <div className="flex justify-end">
            <Button type="submit" loading={profileMutation.isPending} icon={<Save size={15} />}>
              Enregistrer
            </Button>
          </div>
          {profileMutation.isSuccess && <p className="text-green-600 text-sm text-right">✓ Profil mis à jour</p>}
          {profileMutation.isError && <p className="text-red-600 text-sm text-right">{apiErrorMessage(profileMutation.error)}</p>}
        </form>
      </div>

      {/* Broadcast notification */}
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-5">
          <Bell size={16} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Envoyer une notification à tous les clients</h2>
        </div>
        <div className="space-y-3">
          <Input
            label="Titre"
            value={notifTitle}
            onChange={e => setNotifTitle(e.target.value)}
            placeholder="Ex: Nouvelle promotion disponible !"
          />
          <Textarea
            label="Message"
            value={notifMsg}
            onChange={e => setNotifMsg(e.target.value)}
            rows={4}
            placeholder="Contenu de la notification..."
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-amber-600 flex items-center gap-1.5 font-medium">
              <AlertTriangle size={12} />
              In-app à tous les clients · email aux abonnés newsletter uniquement
            </p>
            <Button
              onClick={() => broadcastMutation.mutate({ title: notifTitle, message: notifMsg, type: 'info' })}
              loading={broadcastMutation.isPending}
              disabled={!notifTitle || !notifMsg}
              icon={<Send size={15} />}
            >
              Envoyer
            </Button>
          </div>
          {notifSuccess && <p className="text-green-600 text-sm font-medium">✓ Notification envoyée avec succès</p>}
          {broadcastMutation.isError && <p className="text-red-600 text-sm font-medium">{apiErrorMessage(broadcastMutation.error)}</p>}
        </div>
      </div>

      {/* Coordonnées & réseaux sociaux du site public */}
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-5">
          <Phone size={16} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Coordonnées & réseaux sociaux</h2>
        </div>
        <p className="text-xs text-slate-500 -mt-3 mb-5">
          Ces informations sont affichées sur le site client (Header, Footer, page Contact, WhatsApp SAV, etc.)
        </p>
        {loadingSite ? (
          <div className="h-40 bg-slate-50 rounded-xl animate-pulse" />
        ) : (
          <form onSubmit={handleSubmitSite(d => siteMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Téléphone affiché" {...registerSite('supportPhone')} placeholder="+225 01 41 00 00 12" />
              <Input label="Numéro WhatsApp (chiffres uniquement)" {...registerSite('whatsappNumber')} placeholder="2250700000000" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Email support (SAV)" {...registerSite('supportEmail')} type="email" placeholder="support@skignas.com" />
              <Input label="Email de contact général" {...registerSite('contactEmail')} type="email" placeholder="hello@skignas.com" />
            </div>
            <Input label="Adresse" {...registerSite('address')} placeholder="Cocody, Abidjan - Côte d'Ivoire" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Facebook" {...registerSite('facebookUrl')} placeholder="https://facebook.com/skignas" />
              <Input label="Instagram" {...registerSite('instagramUrl')} placeholder="https://instagram.com/skignas" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="YouTube" {...registerSite('youtubeUrl')} placeholder="https://youtube.com/@skignas" />
              <Input label="TikTok" {...registerSite('tiktokUrl')} placeholder="https://tiktok.com/@skignas" />
            </div>
            <div className="flex justify-end items-center gap-3">
              {siteSuccess && <p className="text-green-600 text-sm">✓ Coordonnées mises à jour</p>}
              {siteMutation.isError && <p className="text-red-600 text-sm">{apiErrorMessage(siteMutation.error)}</p>}
              <Button type="submit" loading={siteMutation.isPending} icon={<Save size={15} />}>
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Notifications de nouvelle commande */}
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-2">
          <Mail size={16} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Notifications de nouvelle commande</h2>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Ces adresses reçoivent un email à chaque nouvelle commande passée sur le site. Retire une adresse pour qu'elle arrête de recevoir ces emails.
        </p>

        {loadingSite ? (
          <div className="h-16 bg-slate-50 rounded-xl animate-pulse" />
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {notifyEmails.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucun destinataire — personne ne sera notifié par email des nouvelles commandes.</p>
              ) : (
                notifyEmails.map(email => (
                  <span key={email} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium pl-3 pr-1.5 py-1.5 rounded-full border border-indigo-100">
                    {email}
                    <button type="button" onClick={() => removeNotifyEmail(email)}
                      className="p-0.5 rounded-full hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 transition-colors" title="Retirer">
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newNotifyEmail}
                onChange={e => setNewNotifyEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNotifyEmail() } }}
                type="email"
                placeholder="email@exemple.com"
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={addNotifyEmail} disabled={!newNotifyEmail.trim()} icon={<Plus size={15} />}>
                Ajouter
              </Button>
            </div>
            {siteMutation.isError && <p className="text-red-600 text-sm mt-2">{apiErrorMessage(siteMutation.error)}</p>}
          </>
        )}
      </div>

      {/* Export des images */}
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-2">
          <Archive size={16} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Export des images</h2>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Télécharge une archive ZIP contenant toutes les images actuellement stockées sur le serveur
          (produits, catégories, demandes, retours) — utile pour une sauvegarde manuelle.
        </p>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => exportImagesMutation.mutate()}
            loading={exportImagesMutation.isPending}
            icon={<Download size={15} />}
          >
            {exportImagesMutation.isPending ? 'Préparation du ZIP…' : 'Télécharger toutes les images (ZIP)'}
          </Button>
          {exportImagesMutation.isError && <p className="text-red-600 text-sm">{apiErrorMessage(exportImagesMutation.error)}</p>}
        </div>
      </div>

      {/* App info */}
      <div className={cardCls}>
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Informations système</h2>
        <div className="space-y-2 text-sm">
          {[
            ['Backoffice', 'Skignas Admin v1.0.0'],
            ['API', import.meta.env.VITE_API_URL ?? 'http://localhost:4000'],
            ['Environnement', import.meta.env.MODE],
            ['Utilisateur connecté', `${user?.prenom} ${user?.nom} (${user?.role})`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-slate-500">{k}</span>
              <span className="text-slate-700 font-mono text-xs">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
