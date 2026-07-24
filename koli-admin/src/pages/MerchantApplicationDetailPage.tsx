import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Store, User, MapPin, CreditCard, ShieldCheck, Truck, Settings2,
  CheckCircle2, XCircle, FileText, Globe, Mail,
} from 'lucide-react'
import { api, BASE, fmtDateTime } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Input'
import type { MerchantApplication } from '../types'

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{value?.trim() || '—'}</p>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
        {icon} {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </Card>
  )
}

/* Documents privés stockgo — jamais affichés en <img src> direct, relayés
   via backend/ (cf. routes/merchant-applications.ts) pour ne pas exposer
   la clé stockgo au navigateur. */
function DocumentLink({ label, url }: { label: string; url?: string }) {
  if (!url) return (
    <div className="flex items-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl px-3 py-2.5">
      <FileText size={14} /> {label} — non fourni
    </div>
  )
  const proxied = `${BASE}/api/admin/merchant-applications/document?url=${encodeURIComponent(url)}`
  return (
    <a href={proxied} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-xl px-3 py-2.5 transition-colors">
      <FileText size={14} /> {label}
    </a>
  )
}

const DIDIT_BADGE_COLOR: Record<string, string> = {
  Approved: 'approved', Declined: 'rejected', 'In Review': 'pending_review',
  'In Progress': 'pending', Abandoned: 'skipped', Expired: 'skipped', 'Kyc Expired': 'skipped',
}

export default function MerchantApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const { data: app, isLoading } = useQuery({
    queryKey: ['merchant-application', id],
    queryFn:  async () => { const { data } = await api.get(`/api/admin/merchant-applications/${id}`); return data.data as MerchantApplication },
  })

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/api/admin/merchant-applications/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['merchant-application', id] }),
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/api/admin/merchant-applications/${id}/reject`, { reason: rejectReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merchant-application', id] })
      setShowRejectForm(false)
      setRejectReason('')
    },
  })

  if (isLoading || !app) {
    return <div className="h-64 bg-slate-50 rounded-2xl animate-pulse" />
  }

  const reviewable = app.status === 'submitted' || app.status === 'pending_review'

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate('/merchant-applications')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{app.nomBoutique || 'Boutique sans nom'}</h1>
            <Badge label={app.status} />
            {app.diditStatus && <Badge label={app.diditStatus} color={DIDIT_BADGE_COLOR[app.diditStatus] ?? 'pending'} />}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {app.submittedAt ? `Soumise le ${fmtDateTime(app.submittedAt)}` : 'Brouillon non soumis'}
          </p>
        </div>
      </div>

      {app.status === 'rejected' && app.rejectionReason && (
        <Card className="p-4 border-red-200 bg-red-50/50">
          <p className="text-sm font-semibold text-red-700">Motif du rejet</p>
          <p className="text-sm text-red-600 mt-1">{app.rejectionReason}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Section icon={<User size={15} className="text-indigo-500" />} title="Informations personnelles">
            <Field label="Date de naissance" value={app.dateNaissance} />
            <Field label="Résidence" value={[app.villeResidence, app.paysResidence].filter(Boolean).join(', ')} />
            <Field label="Langue" value={app.langue} />
            <Field label="Devise" value={app.devise} />
          </Section>

          <Section icon={<Store size={15} className="text-indigo-500" />} title="Boutique">
            <Field label="Nom" value={app.nomBoutique} />
            <Field label="Catégorie" value={app.categorieActivite} />
            <Field label="Site web" value={app.siteWeb} />
            <div className="sm:col-span-2">
              <Field label="Description" value={app.descriptionBoutique} />
            </div>
          </Section>

          <Section icon={<Globe size={15} className="text-indigo-500" />} title="Statut légal">
            <Field label="Type d'entreprise" value={app.typeEntreprise} />
            <Field label="Numéro RCCM" value={app.numeroLegal} />
            <Field label="Numéro NCC" value={app.numeroNCC} />
            <Field label="Forme juridique" value={app.formeJuridique} />
            <Field label="Nom de l'entreprise" value={app.nomEntreprise} />
            <Field label="Adresse du siège" value={app.adresseSiege} />
          </Section>

          <Section icon={<MapPin size={15} className="text-indigo-500" />} title="Adresse boutique">
            <Field label="Pays / Région" value={[app.paysAdresse, app.regionAdresse].filter(Boolean).join(' / ')} />
            <Field label="Ville" value={app.villeAdresse} />
            <Field label="Code postal" value={app.codePostal} />
            <div className="sm:col-span-2">
              <Field label="Adresse complète" value={app.adresseComplete} />
            </div>
          </Section>

          <Section icon={<CreditCard size={15} className="text-indigo-500" />} title="Paiement">
            <Field label="Moyen préféré" value={app.moyenPaiementPrefere} />
            <Field label="Opérateur Mobile Money" value={app.mobileMoneyOperateur} />
            <Field label="Numéro Mobile Money" value={app.mobileMoneyNumero} />
            <Field label="Titulaire du compte" value={app.titulaireCompte} />
            <Field label="Banque" value={app.banque} />
            <Field label="IBAN / SWIFT" value={[app.iban, app.swift].filter(Boolean).join(' / ')} />
          </Section>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck size={15} className="text-indigo-500" /> Vérification d'identité (KYC)
            </h3>
            <p className="text-xs text-slate-500 mb-3">Type de document : <strong className="text-slate-700">{app.typeDocument}</strong></p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <DocumentLink label="Pièce d'identité" url={app.documentIdentiteUrl} />
              <DocumentLink label="Selfie" url={app.selfieUrl} />
              <DocumentLink label="Justificatif de domicile" url={app.justificatifDomicileUrl} />
            </div>
            {app.diditSessionId && (
              <p className="text-xs text-slate-400 mt-3">
                Session Didit : <code className="text-slate-600">{app.diditSessionId}</code>
                {app.diditEnvironment && ` (${app.diditEnvironment})`}
                {app.diditUpdatedAt && ` — mise à jour ${fmtDateTime(app.diditUpdatedAt)}`}
              </p>
            )}
          </Card>

          <Section icon={<Truck size={15} className="text-indigo-500" />} title="Livraison">
            <Field label="Zones" value={app.zonesLivraison} />
            <Field label="Modes" value={app.modesLivraison} />
            <Field label="Délais" value={app.delaisLivraison} />
            <Field label="Frais" value={app.fraisLivraison} />
            <Field label="Retrait en boutique" value={app.retraitMagasin ? 'Oui' : 'Non'} />
          </Section>

          <Section icon={<Settings2 size={15} className="text-indigo-500" />} title="Paramètres boutique">
            <Field label="Domaine personnalisé" value={app.domainePersonnalise} />
            <Field label="Horaires" value={app.horairesOuverture} />
            <Field label="Facebook" value={app.facebook} />
            <Field label="Instagram" value={app.instagram} />
            <Field label="WhatsApp" value={app.whatsapp} />
            <div className="sm:col-span-2">
              <Field label="Politique de retour" value={app.politiqueRetour} />
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Décision</h3>
            {!reviewable ? (
              <p className="text-sm text-slate-500">
                {app.status === 'approved' ? 'Candidature déjà approuvée.'
                  : app.status === 'rejected' ? 'Candidature déjà rejetée.'
                  : 'Candidature pas encore soumise par le marchand.'}
              </p>
            ) : showRejectForm ? (
              <div className="space-y-3">
                <Textarea
                  label="Motif du rejet"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Ex : document d'identité illisible, informations incohérentes…"
                />
                {rejectMutation.isError && <p className="text-xs text-red-600">Erreur lors du rejet</p>}
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowRejectForm(false)}>Annuler</Button>
                  <Button variant="danger" size="sm" icon={<XCircle size={14} />} loading={rejectMutation.isPending}
                    disabled={!rejectReason.trim()} onClick={() => rejectMutation.mutate()}>
                    Confirmer le rejet
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {approveMutation.isError && <p className="text-xs text-red-600">Erreur lors de l'approbation</p>}
                <Button variant="success" icon={<CheckCircle2 size={14} />} loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}>
                  Approuver
                </Button>
                <Button variant="danger" icon={<XCircle size={14} />} onClick={() => setShowRejectForm(true)}>
                  Rejeter
                </Button>
              </div>
            )}
          </Card>

          {app.email && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Contact</h3>
              <a href={`mailto:${app.email}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-indigo-600">
                <Mail size={13} className="text-slate-400" /> {app.email}
              </a>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
