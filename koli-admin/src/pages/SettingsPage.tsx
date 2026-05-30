import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Save, Bell, Send, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { PageTitle } from '../components/layout/Sidebar'

export default function SettingsPage() {
  const { user } = useAuth()
  const [notifMsg, setNotifMsg]       = useState('')
  const [notifTitle, setNotifTitle]   = useState('')
  const [notifSuccess, setNotifSuccess] = useState(false)

  const { register, handleSubmit } = useForm({
    defaultValues: { prenom: user?.prenom, nom: user?.nom, email: user?.email },
  })

  const profileMutation = useMutation({
    mutationFn: (body: object) => api.put('/api/auth/me', body),
  })

  const broadcastMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/notifications/broadcast', body),
    onSuccess: () => { setNotifSuccess(true); setNotifMsg(''); setNotifTitle(''); setTimeout(() => setNotifSuccess(false), 3000) },
  })

  const cardCls = "bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"

  return (
    <div className="space-y-6 max-w-3xl">
      <PageTitle title="Paramètres" sub="Gestion du compte administrateur" />

      {/* Profil */}
      <div className={cardCls}>
        <h2 className="text-sm font-semibold text-slate-900 mb-5">Profil administrateur</h2>
        <form onSubmit={handleSubmit(d => profileMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              Notification envoyée à tous les utilisateurs inscrits
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
        </div>
      </div>

      {/* App info */}
      <div className={cardCls}>
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Informations système</h2>
        <div className="space-y-2 text-sm">
          {[
            ['Backoffice', 'Koli Admin v1.0.0'],
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
