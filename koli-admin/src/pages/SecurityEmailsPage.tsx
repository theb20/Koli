import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, X, Send, Palette, Code2, Eye } from 'lucide-react'
import { api, fmtDateTime } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Input, Textarea } from '../components/ui/Input'
import { Confirm } from '../components/ui/Modal'
import { PageTitle } from '../components/layout/Sidebar'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

// StudioMail n'est pas (encore) déployé — pas d'URL de production à
// renseigner, seulement un repli pour le développement local. Le bouton
// ouvre juste l'outil ; le pont réel vers l'envoi se fait en copiant son
// export HTML dans le mode "HTML personnalisé" ci-dessous (voir
// studiomail/README.md, section "Pont vers les e-mails de sécurité").
const STUDIOMAIL_URL = import.meta.env.VITE_STUDIOMAIL_URL || 'https://studiomail.skignas.com'

type Audience = 'all' | 'targeted'
type PickedUser = { id: string; prenom: string; nom: string; email: string }
type Campaign = {
  id: string; subject: string; message: string; customHtml: string | null; audience: Audience
  status: 'pending' | 'sending' | 'done' | 'failed'
  totalRecipients: number; sentCount: number; failedCount: number
  failedEmails: string | null
  createdAt: string; completedAt: string | null
  createdBy: { prenom: string; nom: string; email: string }
}

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Échec de l'envoi"

function UserPicker({ selected, onAdd, onRemove }: {
  selected: PickedUser[]
  onAdd: (u: PickedUser) => void
  onRemove: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const { data: results = [] } = useQuery({
    queryKey: ['users-picker', debouncedQ],
    queryFn: async () => {
      const { data } = await api.get(`/api/auth/users?limit=10${debouncedQ ? `&q=${encodeURIComponent(debouncedQ)}` : ''}`)
      return data.data.users as PickedUser[]
    },
  })
  const selectedIds = new Set(selected.map(u => u.id))

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un utilisateur (nom, email)..."
          className="w-full h-10 rounded-input border border-line pl-9 pr-3 text-body text-ink focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors" />
      </div>
      {results.length > 0 && (
        <div className="border border-line rounded-input divide-y divide-line max-h-48 overflow-y-auto">
          {results.map(u => (
            <button key={u.id} type="button" disabled={selectedIds.has(u.id)} onClick={() => onAdd(u)}
              className="w-full flex items-center justify-between px-3 py-2 text-left text-secondary hover:bg-hover-fill disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <span className="truncate text-ink">{u.prenom} {u.nom} <span className="text-muted">— {u.email}</span></span>
              {!selectedIds.has(u.id) && <span className="text-caption text-primary shrink-0 ml-2">Ajouter</span>}
            </button>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(u => (
            <span key={u.id} className="inline-flex items-center gap-1.5 bg-hover-fill border border-line rounded-full pl-3 pr-1.5 py-1 text-caption text-ink">
              {u.prenom} {u.nom}
              <button type="button" onClick={() => onRemove(u.id)} aria-label={`Retirer ${u.prenom}`}
                className="w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-line transition-colors">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SecurityEmailsPage() {
  const qc = useQueryClient()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [htmlMode, setHtmlMode] = useState(false)
  const [customHtml, setCustomHtml] = useState('')
  const [audience, setAudience] = useState<Audience>('targeted')
  const [picked, setPicked] = useState<PickedUser[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pollingId, setPollingId] = useState<string | null>(null)

  const { data: activeCount } = useQuery({
    queryKey: ['active-users-count'],
    queryFn: async () => (await api.get('/api/auth/users?banned=false&limit=1')).data.data.pagination.total as number,
    staleTime: 60_000,
  })

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['security-email-campaigns'],
    queryFn: async () => (await api.get('/api/admin/security-emails')).data.data as Campaign[],
  })

  const { data: polled } = useQuery({
    queryKey: ['security-email-campaign', pollingId],
    queryFn: async () => (await api.get(`/api/admin/security-emails/${pollingId}`)).data.data as Campaign,
    enabled: !!pollingId,
    refetchInterval: query => (query.state.data?.status === 'done' || query.state.data?.status === 'failed') ? false : 1500,
  })

  useEffect(() => {
    if (polled && (polled.status === 'done' || polled.status === 'failed')) {
      qc.invalidateQueries({ queryKey: ['security-email-campaigns'] })
      toast.success(`Campagne terminée : ${polled.sentCount} envoyé${polled.sentCount > 1 ? 's' : ''}, ${polled.failedCount} échec${polled.failedCount > 1 ? 's' : ''}.`)
      setPollingId(null)
    }
  }, [polled, qc])

  const recipientCount = audience === 'all' ? (activeCount ?? 0) : picked.length

  const send = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/admin/security-emails', {
        subject, message, audience,
        userIds: audience === 'targeted' ? picked.map(u => u.id) : undefined,
        customHtml: htmlMode ? customHtml : undefined,
      })
      return data.data as Campaign
    },
    onSuccess: campaign => {
      setConfirmOpen(false)
      setSubject(''); setMessage(''); setPicked([]); setCustomHtml(''); setHtmlMode(false)
      qc.invalidateQueries({ queryKey: ['security-email-campaigns'] })
      setPollingId(campaign.id)
      toast.success('Envoi démarré.')
    },
    onError: e => toast.error(errMsg(e)),
  })

  const canSend = subject.trim().length >= 3 && message.trim().length >= 3 && recipientCount > 0 && (!htmlMode || customHtml.trim().length > 0)

  return (
    <div className="space-y-5">
      <PageTitle title="E-mails de sécurité" sub="Alertes de sécurité envoyées par e-mail, ciblées ou à tous les utilisateurs de la plateforme."
        action={
          <Button variant="secondary" icon={<Palette size={15} />} onClick={() => window.open(STUDIOMAIL_URL, '_blank', 'noopener,noreferrer')}>
            Concevoir dans StudioMail
          </Button>
        } />

      <Card padded className="space-y-4">
        <Input label="Objet" value={subject} onChange={e => setSubject(e.target.value)}
          placeholder="Ex : Activité suspecte détectée sur votre compte" maxLength={200} />

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setHtmlMode(false)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-input text-secondary font-medium border transition-colors ${!htmlMode ? 'bg-primary/10 border-primary text-primary' : 'border-line text-ink-2 hover:bg-hover-fill'}`}>
            Message simple
          </button>
          <button type="button" onClick={() => setHtmlMode(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-input text-secondary font-medium border transition-colors ${htmlMode ? 'bg-primary/10 border-primary text-primary' : 'border-line text-ink-2 hover:bg-hover-fill'}`}>
            <Code2 size={14} /> HTML personnalisé (StudioMail)
          </button>
        </div>

        <Textarea label={htmlMode ? 'Note interne (non envoyée, pour l’historique)' : 'Message'} rows={htmlMode ? 2 : 5}
          value={message} onChange={e => setMessage(e.target.value)}
          placeholder={htmlMode ? 'Ex : design StudioMail — campagne de phishing octobre' : 'Décrivez l’alerte et l’action recommandée...'} maxLength={5000} />

        {htmlMode && (
          <div className="space-y-2.5">
            <Textarea label="HTML de l'e-mail (collez ici l'export de StudioMail)" rows={8} value={customHtml}
              onChange={e => setCustomHtml(e.target.value)} placeholder="<html>...</html>"
              className="font-mono text-[12px]" />
            {customHtml.trim() && (
              <div>
                <p className="text-caption font-semibold uppercase tracking-wide text-muted mb-1.5 flex items-center gap-1"><Eye size={12} /> Aperçu</p>
                <iframe title="Aperçu de l'e-mail" srcDoc={customHtml} className="w-full h-72 rounded-input border border-line bg-white" />
              </div>
            )}
            <p className="text-caption text-muted">
              Ce HTML remplace entièrement le message ci-dessus à l'envoi — aucune personnalisation par destinataire (même contenu pour tout le monde).
            </p>
          </div>
        )}

        <div>
          <p className="text-secondary font-medium text-ink-2 mb-2">Destinataires</p>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setAudience('targeted')}
              className={`px-3.5 py-2 rounded-input text-secondary font-medium border transition-colors ${audience === 'targeted' ? 'bg-primary/10 border-primary text-primary' : 'border-line text-ink-2 hover:bg-hover-fill'}`}>
              Utilisateurs ciblés
            </button>
            <button type="button" onClick={() => setAudience('all')}
              className={`px-3.5 py-2 rounded-input text-secondary font-medium border transition-colors ${audience === 'all' ? 'bg-primary/10 border-primary text-primary' : 'border-line text-ink-2 hover:bg-hover-fill'}`}>
              Tous les utilisateurs {activeCount != null && `(${activeCount})`}
            </button>
          </div>
          {audience === 'targeted' && (
            <UserPicker selected={picked}
              onAdd={u => setPicked(prev => [...prev, u])}
              onRemove={id => setPicked(prev => prev.filter(u => u.id !== id))} />
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-line">
          <p className="text-secondary text-ink-2">
            {recipientCount > 0
              ? <>Sera envoyé à <strong className="text-ink">{recipientCount}</strong> utilisateur{recipientCount > 1 ? 's' : ''}.</>
              : 'Sélectionnez au moins un destinataire.'}
          </p>
          <Button icon={<Send size={15} />} disabled={!canSend} onClick={() => setConfirmOpen(true)}>Envoyer</Button>
        </div>
      </Card>

      <Confirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => send.mutate()}
        loading={send.isPending}
        title="Envoyer cet e-mail de sécurité ?"
        message={`Il sera envoyé à ${recipientCount} utilisateur${recipientCount > 1 ? 's' : ''}${audience === 'all' ? ' — TOUTE la plateforme' : ''}${htmlMode ? ', avec le design HTML personnalisé ci-dessus' : ''}. Cette action est irréversible.`}
        confirmLabel="Envoyer"
        confirmText="ENVOYER"
      />

      <Card padded>
        <h2 className="text-card-title font-medium text-ink mb-4">Historique des campagnes</h2>
        {isLoading ? (
          <div className="h-32 bg-hover-fill rounded-input animate-pulse" />
        ) : campaigns.length === 0 ? (
          <p className="text-secondary text-muted py-6 text-center">Aucune campagne envoyée pour l'instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  {['Objet', 'Audience', 'Destinataires', 'Statut', 'Par', 'Date'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-caption font-semibold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td className="px-3 py-2.5 text-secondary text-ink max-w-[240px]">
                      <span className="truncate block" title={c.subject}>{c.subject}</span>
                      {c.customHtml && <span className="inline-flex items-center gap-1 text-caption text-primary mt-0.5"><Code2 size={10} /> HTML personnalisé</span>}
                    </td>
                    <td className="px-3 py-2.5 text-secondary text-ink-2">{c.audience === 'all' ? 'Tous' : 'Ciblé'}</td>
                    <td className="px-3 py-2.5 text-secondary text-ink-2">
                      {c.sentCount}/{c.totalRecipients}
                      {c.failedCount > 0 && <span className="text-down"> ({c.failedCount} échec{c.failedCount > 1 ? 's' : ''})</span>}
                    </td>
                    <td className="px-3 py-2.5"><Badge label={c.status} /></td>
                    <td className="px-3 py-2.5 text-secondary text-ink-2">{c.createdBy.prenom} {c.createdBy.nom}</td>
                    <td className="px-3 py-2.5 text-caption text-muted">{fmtDateTime(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
