/**
 * Génère docs/dictionnaire-metriques-marchand.md depuis la source unique
 * src/lib/sellerMetrics/dictionary.ts — ne pas éditer le .md à la main.
 * Usage : npm run metrics:doc
 */
import fs from 'fs'
import path from 'path'
import { SELLER_METRICS, SELLER_ALERT_THRESHOLDS } from '../src/lib/sellerMetrics/dictionary'

const OUT = path.resolve(__dirname, '../../docs/dictionnaire-metriques-marchand.md')
const lines: string[] = [
  '# Dictionnaire des métriques — tableau de bord marchand Skignas',
  '',
  '> Fichier généré par `npm run metrics:doc` (backend) depuis `backend/src/lib/sellerMetrics/dictionary.ts`.',
  '> Ne pas modifier à la main : modifier le dictionnaire dans le code, puis régénérer.',
  '',
  '## Règles communes',
  '',
  '- **Monnaie** : F CFA (XOF), montants entiers, séparateur de milliers espace. HT par défaut (TVA Côte d\'Ivoire 18 %, configurable dans l\'admin, payée par le client, jamais au marchand).',
  '- **Fuseau** : Africa/Abidjan pour toutes les bornes de période et les jours.',
  '- **Commande valide** : payée, ni annulée ni remboursée en totalité, non supprimée. Un marchand ne voit aucun chiffre issu d\'une commande non encaissée.',
  '- **Date de référence** : date de paiement (date de création pour les commandes payées avant le 27/09/2026).',
  '- **Périmètre** : uniquement les lignes du marchand ; une commande peut mélanger plusieurs boutiques.',
  '- **Règle d\'or** : un indicateur absent de ce dictionnaire n\'apparaît pas dans le tableau de bord.',
  '',
]
for (const m of Object.values(SELLER_METRICS)) {
  lines.push(`## ${m.name} \`${m.id}\``, '', m.definition, '', '| | |', '|---|---|',
    `| Formule | ${m.formula} |`, `| Inclus | ${m.included} |`, `| Exclu | ${m.excluded} |`,
    `| Source | ${m.source} |`, `| Rafraîchissement | ${m.refresh} |`, `| Propriétaire | ${m.owner} |`, '')
}
lines.push('## Seuils des alertes', '', '| Seuil | Valeur |', '|---|---|',
  `| Couverture de stock « à risque » | moins de ${SELLER_ALERT_THRESHOLDS.stockCoverageDays} jours |`,
  `| Fenêtre des ventes pour la couverture | ${SELLER_ALERT_THRESHOLDS.salesWindowDays} derniers jours |`,
  `| Commande payée non expédiée | plus de ${SELLER_ALERT_THRESHOLDS.unshippedHours} h |`,
  `| Taux de retour élevé | plus de ${SELLER_ALERT_THRESHOLDS.returnRatePct} % (à partir de 10 unités vendues) |`, '')
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, lines.join('\n'))
console.log(`✓ ${path.relative(process.cwd(), OUT)} (${Object.keys(SELLER_METRICS).length} fiches)`)
