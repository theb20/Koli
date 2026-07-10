/* ─────────────────────────────────────────────────────────────
   Design des emails transactionnels — édition par tokens (couleurs,
   rayon, logo, textes), pas par édition de HTML brut.

   Pourquoi pas un éditeur HTML libre : le design visible (header,
   carte) est en styles inline (obligatoire pour Gmail mobile et
   Outlook, qui ignorent largement <head><style>) — éditer un bloc
   <style> séparé ne peut donc jamais le surcharger. Les tokens sont
   injectés directement dans les styles inline au moment du rendu,
   ce qui fonctionne réellement sur tous les clients mail.

   L'aperçu est le VRAI rendu serveur (avec les tokens en cours
   d'édition, pas encore sauvegardés) — pas une simulation côté
   navigateur. Sauvegarder les applique immédiatement à tous les
   emails réels envoyés par l'application.
───────────────────────────────────────────────────────────── */
import { useEffect, useState } from 'react'
import { Mail, Save, RotateCcw, Palette } from 'lucide-react'
import { api } from '../lib/api'

type EmailDesignTokens = {
  primaryColor:       string
  headerGradientFrom: string
  headerGradientTo:   string
  cardRadius:         number
  cardBg:             string
  bodyBg:             string
  footerText:         string
  logoUrl:            string
  badgeText:          string
}

const FIELD_LABELS: Record<keyof EmailDesignTokens, string> = {
  primaryColor:       'Couleur principale',
  headerGradientFrom: 'Header — dégradé début',
  headerGradientTo:   'Header — dégradé fin',
  cardRadius:         'Arrondi de la carte (px)',
  cardBg:             'Fond de la carte',
  bodyBg:             'Fond général',
  footerText:         'Texte de bas de page',
  logoUrl:            'URL du logo (https)',
  badgeText:          'Texte du badge (header)',
}

const COLOR_FIELDS: (keyof EmailDesignTokens)[] = ['primaryColor', 'headerGradientFrom', 'headerGradientTo', 'cardBg', 'bodyBg']

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<string[]>([])
  const [selected, setSelected]   = useState<string | null>(null)
  const [tokens, setTokens]       = useState<EmailDesignTokens | null>(null)
  const [html, setHtml]           = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [resetting, setResetting] = useState(false)
  const [saveMsg, setSaveMsg]     = useState<{ ok: boolean; text: string } | null>(null)
  const [error, setError]         = useState('')

  // Chargement initial : liste des templates + tokens sauvegardés
  useEffect(() => {
    Promise.all([
      api.get('/api/email-templates'),
      api.get('/api/email-templates/design/tokens'),
    ])
      .then(([listRes, tokensRes]) => {
        const list = listRes.data.data.templates as string[]
        setTemplates(list)
        setTokens(tokensRes.data.data.tokens as EmailDesignTokens)
        if (list[0]) setSelected(list[0])
      })
      .catch(() => setError('Impossible de charger les templates ou le design actuel.'))
  }, [])

  // Aperçu — rendu réel côté serveur avec les tokens en cours d'édition
  // (pas encore sauvegardés), débouncé pour ne pas spammer à chaque frappe.
  useEffect(() => {
    if (!selected || !tokens) return
    const timer = setTimeout(() => {
      setLoadingPreview(true)
      api.get(`/api/email-templates/${selected}`, {
        params: { tokens: JSON.stringify(tokens) },
        responseType: 'text',
      })
        .then(res => setHtml(res.data as string))
        .catch(() => setError('Erreur de chargement de l\'aperçu.'))
        .finally(() => setLoadingPreview(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [selected, tokens])

  const setField = <K extends keyof EmailDesignTokens>(key: K, value: EmailDesignTokens[K]) => {
    setTokens(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const saveDesign = async () => {
    if (!tokens) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await api.put('/api/email-templates/design/tokens', tokens)
      setSaveMsg({ ok: true, text: res.data.message ?? 'Sauvegardé.' })
    } catch (err) {
      const text = (err as { response?: { data?: { message?: string; errors?: unknown } } }).response?.data?.message ?? 'Erreur lors de la sauvegarde.'
      setSaveMsg({ ok: false, text })
    } finally {
      setSaving(false)
    }
  }

  const resetDesign = async () => {
    const ok = window.confirm('Restaurer le design par défaut pour tous les emails ? Le design personnalisé actuel sera perdu.')
    if (!ok) return
    setResetting(true)
    try {
      await api.delete('/api/email-templates/design/tokens')
      const res = await api.get('/api/email-templates/design/tokens')
      setTokens(res.data.data.tokens as EmailDesignTokens)
      setSaveMsg({ ok: true, text: 'Design par défaut restauré.' })
    } catch {
      setSaveMsg({ ok: false, text: 'Erreur lors de la réinitialisation.' })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-4">
      {/* Liste des templates */}
      <div className="w-56 shrink-0 bg-white border border-slate-200 rounded-2xl p-3 overflow-y-auto">
        <div className="flex items-center gap-2 px-2 py-2 mb-1">
          <Mail size={15} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Templates</h2>
        </div>
        {error && <p className="text-xs text-red-500 px-2">{error}</p>}
        {templates.map(t => (
          <button
            key={t}
            onClick={() => setSelected(t)}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm mb-0.5 transition-colors ${
              selected === t ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Formulaire de tokens */}
      <div className="w-[34%] shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Palette size={14} /> Design</p>
          <div className="flex items-center gap-1">
            <button
              onClick={resetDesign}
              disabled={resetting}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={12} /> Défaut
            </button>
            <button
              onClick={saveDesign}
              disabled={saving || !tokens}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={12} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
        {saveMsg && (
          <p className={`text-xs px-4 py-2 border-b border-slate-100 ${saveMsg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
            {saveMsg.text}
          </p>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!tokens ? (
            <p className="text-sm text-slate-400">Chargement…</p>
          ) : (
            <>
              {COLOR_FIELDS.map(key => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{FIELD_LABELS[key]}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tokens[key]}
                      onChange={e => setField(key, e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={tokens[key]}
                      onChange={e => setField(key, e.target.value)}
                      className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{FIELD_LABELS.cardRadius}</label>
                <input
                  type="number" min={0} max={40}
                  value={tokens.cardRadius}
                  onChange={e => setField('cardRadius', Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{FIELD_LABELS.logoUrl}</label>
                <input
                  type="text"
                  value={tokens.logoUrl}
                  onChange={e => setField('logoUrl', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{FIELD_LABELS.badgeText}</label>
                <input
                  type="text" maxLength={40}
                  value={tokens.badgeText}
                  onChange={e => setField('badgeText', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{FIELD_LABELS.footerText}</label>
                <textarea
                  maxLength={200} rows={3}
                  value={tokens.footerText}
                  onChange={e => setField('footerText', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 resize-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Aperçu — rendu réel du serveur */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-medium text-slate-700">{selected ?? '—'}</p>
          {loadingPreview && <span className="text-xs text-slate-400">Actualisation…</span>}
        </div>
        <iframe
          srcDoc={html}
          title="Aperçu email"
          className="flex-1 w-full"
        />
      </div>
    </div>
  )
}
