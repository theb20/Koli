/* ─────────────────────────────────────────────────────────────
   Contrôle qualité avant envoi — liens cassés (détectables : vides ou
   valeur par défaut jamais remplie), images sans texte alternatif,
   contraste insuffisant, objet/pré-en-tête/désinscription manquants.
   Volontairement honnête : ceci ne simule AUCUN client de messagerie réel
   (voir panneau Aperçu), seulement des règles statiques sur le document.
───────────────────────────────────────────────────────────── */
import type { Block, EmailDocument, LeafBlock, Section } from '@/types/document'

export type QAIssue = {
  id: string
  severity: 'error' | 'warning'
  message: string
  blockId?: string
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return null
  return [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)]
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/** Ratio de contraste WCAG — null si une des deux couleurs n'est pas un hex exploitable. */
export function contrastRatio(fg: string, bg: string): number | null {
  const a = hexToRgb(fg)
  const b = hexToRgb(bg)
  if (!a || !b) return null
  const l1 = relLuminance(a)
  const l2 = relLuminance(b)
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

function walkLeaf(blocks: (Block | LeafBlock)[], section: Section, issues: QAIssue[], hasUnsubscribe: { value: boolean }) {
  for (const b of blocks) {
    const bg = b.backgroundColor ?? section.backgroundColor

    if (b.type === 'image') {
      if (!b.src.trim()) issues.push({ id: `${b.id}-src`, severity: 'error', blockId: b.id, message: 'Image sans source (ne s’affichera pas)' })
      if (!b.alt.trim()) issues.push({ id: `${b.id}-alt`, severity: 'warning', blockId: b.id, message: 'Image sans texte alternatif (accessibilité)' })
    }
    if (b.type === 'button') {
      if (!b.href.trim() || b.href === 'https://') issues.push({ id: `${b.id}-href`, severity: 'error', blockId: b.id, message: 'Bouton sans lien valide' })
      const ratio = contrastRatio(b.textColor, b.bgColor)
      if (ratio != null && ratio < 4.5) issues.push({ id: `${b.id}-contrast`, severity: 'warning', blockId: b.id, message: `Contraste du bouton insuffisant (${ratio.toFixed(1)}:1, 4.5:1 recommandé)` })
    }
    if (b.type === 'heading' || b.type === 'paragraph') {
      const ratio = contrastRatio(b.color, bg)
      if (ratio != null && ratio < 4.5) issues.push({ id: `${b.id}-contrast`, severity: 'warning', blockId: b.id, message: `Contraste de texte insuffisant (${ratio.toFixed(1)}:1, 4.5:1 recommandé)` })
    }
    if (b.type === 'footer' && b.unsubscribeUrl?.trim()) hasUnsubscribe.value = true
    if (b.type === 'social') {
      for (const link of b.links) {
        if (!link.url.trim()) issues.push({ id: `${b.id}-${link.id}`, severity: 'warning', blockId: b.id, message: 'Lien de réseau social vide' })
      }
    }
    if (b.type === 'columns') {
      for (const col of b.columns) walkLeaf(col.blocks, section, issues, hasUnsubscribe)
    }
  }
}

export function runQAChecks(doc: EmailDocument): QAIssue[] {
  const issues: QAIssue[] = []

  if (!doc.subject.trim()) issues.push({ id: 'subject-empty', severity: 'error', message: 'Objet manquant' })
  else if (doc.subject.length > 70) issues.push({ id: 'subject-long', severity: 'warning', message: `Objet long (${doc.subject.length} caractères) — 50-60 recommandé pour éviter la troncature` })

  if (!doc.preheader.trim()) issues.push({ id: 'preheader-empty', severity: 'warning', message: 'Pré-en-tête manquant — beaucoup de clients l’affichent à côté de l’objet' })

  if (doc.sections.every(s => s.blocks.length === 0)) issues.push({ id: 'empty-doc', severity: 'error', message: 'Le document ne contient aucun bloc' })

  const hasUnsubscribe = { value: false }
  for (const section of doc.sections) walkLeaf(section.blocks, section, issues, hasUnsubscribe)
  if (!hasUnsubscribe.value) issues.push({ id: 'no-unsubscribe', severity: 'warning', message: 'Aucun lien de désinscription renseigné (recommandé pour une campagne, voir bloc Pied de page)' })

  return issues
}
