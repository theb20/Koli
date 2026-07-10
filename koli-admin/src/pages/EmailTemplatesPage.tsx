/* ─────────────────────────────────────────────────────────────
   Prévisualisation et édition du design des emails transactionnels.

   Le HTML affiché à gauche est le rendu RÉEL de chaque template
   (généré côté serveur, aucun email n'est envoyé). Il est éditable
   directement — chaque frappe met à jour l'aperçu à droite
   instantanément, sans aller-retour serveur.

   Seul le bloc <style> (le design commun à tous les emails —
   couleurs, espacements, polices, dark mode) peut être sauvegardé :
   le reste du HTML contient les données de l'exemple (nom, montants...)
   déjà substituées, donc pas réutilisable tel quel comme source.
   Le design sauvegardé est stocké en base (pas sur disque, qui n'est
   pas persistant en production) et s'applique immédiatement à tous
   les emails réels envoyés par l'application.
───────────────────────────────────────────────────────────── */
import { useEffect, useState } from 'react'
import { RefreshCw, Mail, Copy, Check, Save, RotateCcw } from 'lucide-react'
import { api } from '../lib/api'

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<string[]>([])
  const [selected, setSelected]   = useState<string | null>(null)
  const [html, setHtml]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [saving, setSaving]       = useState(false)
  const [resetting, setResetting] = useState(false)
  const [saveMsg, setSaveMsg]     = useState<{ ok: boolean; text: string } | null>(null)
  const [error, setError]         = useState('')

  const loadTemplate = (name: string) => {
    setSelected(name)
    setLoading(true)
    setError('')
    api.get(`/api/email-templates/${name}`, { responseType: 'text' })
      .then(res => setHtml(res.data as string))
      .catch(() => setError('Erreur de chargement du template.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    api.get('/api/email-templates')
      .then(res => {
        const list = res.data.data.templates as string[]
        setTemplates(list)
        if (list[0]) loadTemplate(list[0])
      })
      .catch(() => setError("Impossible de charger la liste des templates."))
  }, [])

  const copyHtml = () => {
    navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const saveDesign = async () => {
    const match = html.match(/<style>([\s\S]*?)<\/style>/)
    if (!match) {
      window.alert("Aucun bloc <style> trouvé dans le HTML actuel.")
      return
    }
    const ok = window.confirm(
      "Ça va remplacer le design commun à TOUS les emails réels envoyés par l'application (base de données, effet immédiat). Continuer ?"
    )
    if (!ok) return

    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await api.post('/api/email-templates/design/css', { css: match[1] })
      const text = res.data.message ?? 'Sauvegardé.'
      setSaveMsg({ ok: true, text })
      window.alert(`✅ ${text}`)
    } catch (err) {
      const text = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erreur lors de la sauvegarde.'
      setSaveMsg({ ok: false, text })
      window.alert(`❌ ${text}`)
    } finally {
      setSaving(false)
    }
  }

  const resetDesign = async () => {
    const ok = window.confirm("Restaurer le design par défaut pour tous les emails ? Le design personnalisé actuel sera perdu.")
    if (!ok) return
    setResetting(true)
    try {
      await api.delete('/api/email-templates/design/css')
      window.alert('✅ Design par défaut restauré.')
      if (selected) loadTemplate(selected)
    } catch {
      window.alert('❌ Erreur lors de la réinitialisation.')
    } finally {
      setResetting(false)
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
        <button
          onClick={resetDesign}
          disabled={resetting}
          className="w-full flex items-center gap-1.5 text-left px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors mt-2 disabled:opacity-50"
        >
          <RotateCcw size={12} /> Restaurer le design par défaut
        </button>
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
