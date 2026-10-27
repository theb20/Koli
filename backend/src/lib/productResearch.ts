/* ─────────────────────────────────────────────────────────────
   Fiche produit pré-remplie à partir d'un nom : un LLM (Groq) rédige
   description, marque, caractéristiques et choisit la catégorie parmi
   celles du catalogue, en s'appuyant sur les intitulés des offres trouvées
   en ligne. Le résultat est un BROUILLON à relire : jamais publié tel quel.
───────────────────────────────────────────────────────────── */
import { chatCompletion } from './groq'

export type ProductDraft = {
  name: string; brand: string; category: string
  description: string; specs: { label: string; value: string }[]
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Extrait et valide le JSON renvoyé par le modèle ; la catégorie doit exister (sinon vide). */
export function parseDraft(raw: string, categorySlugs: string[]): ProductDraft | null {
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return null
  let j: Record<string, unknown>
  try { j = JSON.parse(m[0]) as Record<string, unknown> } catch { return null }
  const name = str(j['name'], 200)
  if (!name) return null
  const specs = Array.isArray(j['specs']) ? j['specs'].flatMap((s: unknown) => {
    const o = (s ?? {}) as Record<string, unknown>
    const label = str(o['label'], 60), value = str(o['value'], 160)
    return label && value ? [{ label, value }] : []
  }).slice(0, 12) : []
  const category = str(j['category'], 80)
  return { name, brand: str(j['brand'], 80), category: categorySlugs.includes(category) ? category : '', description: str(j['description'], 2000), specs }
}

export async function draftProduct(query: string, offerTitles: string[], categories: { slug: string; name: string }[]): Promise<ProductDraft | null> {
  const res = await chatCompletion([
    { role: 'system', content: "Tu rédiges des fiches produit e-commerce en français pour une boutique en Côte d'Ivoire. Réponds UNIQUEMENT par un objet JSON : {\"name\",\"brand\",\"category\",\"description\",\"specs\":[{\"label\",\"value\"}]}. \"category\" doit être exactement l'un des slugs fournis. N'invente aucune caractéristique incertaine : omets-la. Description : 2 à 4 phrases, sans promesse mensongère." },
    { role: 'user', content: `Produit : ${query}\nIntitulés trouvés en ligne :\n${offerTitles.slice(0, 8).map(t => `- ${t}`).join('\n') || '(aucun)'}\nCatégories (slug : nom) :\n${categories.map(c => `${c.slug} : ${c.name}`).join('\n')}` },
  ], undefined, { maxTokens: 1200 })
  return parseDraft(res.choices[0]?.message.content ?? '', categories.map(c => c.slug))
}
