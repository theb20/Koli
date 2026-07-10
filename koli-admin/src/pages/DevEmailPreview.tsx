/* ─────────────────────────────────────────────────────────────
   FICHIER TEMPORAIRE — édition live des templates email.
   À supprimer (avec la route /dev/emails dans App.tsx et le fichier
   backend/src/routes/dev-email-preview.ts) une fois la relecture finie.

   Nécessite le backend lancé EN LOCAL sur le port 4000 (npm run dev
   dans backend/) — appelle directement localhost, pas l'API de prod.

   Flux : "Charger" récupère le HTML réel généré par le template.
   Le HTML est ensuite éditable directement dans le champ de gauche —
   chaque frappe met à jour l'aperçu à droite instantanément (rendu
   100% côté navigateur, aucun aller-retour serveur). Une fois le
   design qui te convient trouvé, copie-le et reporte les changements
   dans le fichier .ts du template (ou demande-le).
───────────────────────────────────────────────────────────── */
import { useEffect, useState } from 'react'
import { RefreshCw, Mail, Copy, Check, Save } from 'lucide-react'

const BACKEND = 'http://localhost:4000'

export default function DevEmailPreview() {
  const [templates, setTemplates] = useState<string[]>([])
  const [selected, setSelected]   = useState<string | null>(null)
  const [html, setHtml]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState<{ ok: boolean; text: string } | null>(null)
  const [error, setError]         = useState('')

  const loadTemplate = (name: string) => {
    setSelected(name)
    setLoading(true)
    setError('')
    fetch(`${BACKEND}/api/dev/email-preview/${name}`)
      .then(res => res.text())
      .then(setHtml)
      .catch(() => setError('Erreur de chargement du template.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch(`${BACKEND}/api/dev/email-preview`)
      .then(res => res.json())
      .then(json => {
        setTemplates(json.data.templates)
        const first = json.data.templates[0]
        if (first) loadTemplate(first)
      })
      .catch(() => setError("Impossible de contacter le backend local sur localhost:4000. Lancez `npm run dev` dans backend/."))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copyHtml = () => {
    navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const saveDesign = async () => {
    console.log('[email-preview] saveDesign: click reçu, html length =', html.length)
    const match = html.match(/<style>([\s\S]*?)<\/style>/)
    if (!match) {
      window.alert('Aucun bloc <style> trouvé dans le HTML actuel.')
      setSaveMsg({ ok: false, text: 'Aucun bloc <style> trouvé dans le HTML actuel.' })
      return
    }
    const ok = window.confirm(
      "Ça va réécrire le bloc <style> partagé dans backend/src/lib/email/layout.ts, " +
      "ce qui change le design de TOUS les emails réels envoyés par l'app. Continuer ?"
    )
    if (!ok) { console.log('[email-preview] confirm annulé'); return }

    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`${BACKEND}/api/dev/email-preview/design/save-css`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ css: match[1] }),
      })
      const json = await res.json()
      console.log('[email-preview] réponse save-css:', res.status, json)
      const text = json.message ?? (res.ok ? 'Sauvegardé.' : 'Erreur.')
      setSaveMsg({ ok: res.ok, text })
      window.alert(res.ok ? `✅ ${text}` : `❌ ${text}`)
    } catch (err) {
      console.error('[email-preview] échec fetch save-css:', err)
      setSaveMsg({ ok: false, text: 'Impossible de contacter le backend.' })
      window.alert('❌ Impossible de contacter le backend local (localhost:4000). Vérifie qu\'il tourne bien.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-4">
      {/* Liste des templates */}
      <div className="w-64 shrink-0 bg-white border border-slate-200 rounded-2xl p-3 overflow-y-auto">
        <div className="flex items-center gap-2 px-2 py-2 mb-1">
          <Mail size={15} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Templates email</h2>
        </div>
        {error && <p className="text-xs text-red-500 px-2">{error}</p>}
        {templates.map(t => (
          <button
            key={t}
            onClick={() => loadTemplate(t)}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm mb-0.5 transition-colors ${
              selected === t ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Éditeur HTML */}
      <div className="w-[38%] shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-medium text-slate-700">HTML — éditable</p>
          <div className="flex items-center gap-1">
            <button
              onClick={copyHtml}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />} {copied ? 'Copié' : 'Copier'}
            </button>
            <button
              onClick={() => selected && loadTemplate(selected)}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <RefreshCw size={12} /> Recharger l'original
            </button>
            <button
              onClick={saveDesign}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={12} /> {saving ? 'Sauvegarde…' : 'Sauvegarder le design'}
            </button>
          </div>
        </div>
        {saveMsg && (
          <p className={`text-xs px-4 py-2 border-b border-slate-100 ${saveMsg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
            {saveMsg.text}
          </p>
        )}
        <textarea
          value={loading ? 'Chargement…' : html}
          onChange={e => setHtml(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full p-4 font-mono text-xs text-slate-700 outline-none resize-none"
        />
      </div>

      {/* Aperçu live — se met à jour à chaque frappe, sans appel réseau */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-medium text-slate-700">Aperçu en direct</p>
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
