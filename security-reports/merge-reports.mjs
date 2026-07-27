#!/usr/bin/env node
/**
 * Fusionne les résultats bruts de chaque scanner (security-reports/raw/) en
 * un résumé unique — security-reports/SUMMARY.md (Markdown) et
 * security-reports/dashboard.html (vue d'ensemble chiffrée).
 *
 * Défensif par construction : le format exact de sortie d'un outil peut
 * changer d'une version à l'autre — une erreur de parsing sur un outil
 * n'empêche jamais la fusion des autres (voir safeParse ci-dessous).
 */
import fs from 'fs'
import path from 'path'

const [, , rawDir, reportDir, ts] = process.argv

function safeParse(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null
    const content = fs.readFileSync(filePath, 'utf8').trim()
    if (!content) return null
    return JSON.parse(content)
  } catch {
    return null
  }
}

function readText(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null
  } catch {
    return null
  }
}

const findings = [] // { tool, severity, title, file, line, extra }

/* ── Semgrep ─────────────────────────────────────────────────────── */
const semgrep = safeParse(path.join(rawDir, 'semgrep.json'))
if (semgrep?.results) {
  for (const r of semgrep.results) {
    findings.push({
      tool: 'Semgrep',
      severity: (r.extra?.severity ?? 'INFO').toUpperCase(),
      title: r.check_id,
      file: r.path,
      line: r.start?.line,
      extra: r.extra?.message ?? '',
      owasp: r.extra?.metadata?.owasp?.join?.(', ') ?? r.extra?.metadata?.owasp ?? '',
      cwe: r.extra?.metadata?.cwe?.join?.(', ') ?? r.extra?.metadata?.cwe ?? '',
    })
  }
}

/* ── Gitleaks ────────────────────────────────────────────────────── */
const gitleaks = safeParse(path.join(rawDir, 'gitleaks.json'))
if (Array.isArray(gitleaks)) {
  for (const r of gitleaks) {
    findings.push({
      tool: 'Gitleaks',
      severity: 'HIGH',
      title: `Secret potentiel : ${r.RuleID}`,
      file: r.File,
      line: r.StartLine,
      extra: r.Description ?? '',
    })
  }
}

/* ── Trivy — dépendances ─────────────────────────────────────────── */
const trivyFs = safeParse(path.join(rawDir, 'trivy-fs.json'))
for (const result of trivyFs?.Results ?? []) {
  for (const v of result.Vulnerabilities ?? []) {
    findings.push({
      tool: 'Trivy',
      severity: (v.Severity ?? 'UNKNOWN').toUpperCase(),
      title: `${v.VulnerabilityID} — ${v.PkgName}@${v.InstalledVersion}`,
      file: result.Target,
      extra: v.Title ?? '',
      fix: v.FixedVersion ? `Corrigé en ${v.FixedVersion}` : 'Pas de correctif publié',
    })
  }
}

/* ── Trivy — config Dockerfile ───────────────────────────────────── */
for (const f of fs.existsSync(rawDir) ? fs.readdirSync(rawDir) : []) {
  if (!f.startsWith('trivy-config-')) continue
  const data = safeParse(path.join(rawDir, f))
  for (const result of data?.Results ?? []) {
    for (const m of result.Misconfigurations ?? []) {
      findings.push({
        tool: 'Trivy (Docker)',
        severity: (m.Severity ?? 'UNKNOWN').toUpperCase(),
        title: `${m.ID} — ${m.Title}`,
        file: result.Target,
        extra: m.Message ?? '',
      })
    }
  }
}

/* ── Bearer ──────────────────────────────────────────────────────── */
const bearer = safeParse(path.join(rawDir, 'bearer-backend.json'))
if (bearer && typeof bearer === 'object') {
  for (const sev of ['critical', 'high', 'medium', 'low', 'warning']) {
    for (const r of bearer[sev] ?? []) {
      findings.push({
        tool: 'Bearer',
        severity: sev.toUpperCase(),
        title: r.title ?? r.rule_id ?? r.id ?? 'Finding',
        file: r.filename ?? r.full_filename ?? '',
        line: r.line_number,
        extra: r.description ?? '',
        cwe: Array.isArray(r.cwe_ids) ? r.cwe_ids.join(', ') : '',
      })
    }
  }
}

/* ── npm audit ───────────────────────────────────────────────────── */
for (const f of fs.existsSync(rawDir) ? fs.readdirSync(rawDir) : []) {
  if (!f.startsWith('npm-audit-') || !f.endsWith('.json')) continue
  const project = f.replace('npm-audit-', '').replace('.json', '')
  const data = safeParse(path.join(rawDir, f))
  const vulns = data?.vulnerabilities ?? {}
  for (const [pkg, v] of Object.entries(vulns)) {
    findings.push({
      tool: 'npm audit',
      severity: (v.severity ?? 'unknown').toUpperCase(),
      title: `${pkg} (${project})`,
      file: `${project}/package.json`,
      extra: (v.via ?? []).map(x => (typeof x === 'string' ? x : x.title)).filter(Boolean).join('; '),
    })
  }
}

/* ── Headers HTTP ────────────────────────────────────────────────── */
const EXPECTED_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
]
const headerReports = []
for (const f of fs.existsSync(rawDir) ? fs.readdirSync(rawDir) : []) {
  if (!f.startsWith('headers-') || !f.endsWith('.txt')) continue
  const host = f.replace('headers-', '').replace('.txt', '')
  const text = (readText(path.join(rawDir, f)) ?? '').toLowerCase()
  const missing = EXPECTED_HEADERS.filter(h => !text.includes(h + ':'))
  headerReports.push({ host, missing })
  for (const h of missing) {
    findings.push({
      tool: 'Headers HTTP',
      severity: h === 'content-security-policy' || h === 'strict-transport-security' ? 'MEDIUM' : 'LOW',
      title: `En-tête manquant : ${h}`,
      file: host,
      extra: `Non présent dans la réponse HTTPS de ${host}`,
    })
  }
}

/* ── testssl.sh ──────────────────────────────────────────────────── */
const TESTSSL_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM'])
for (const f of fs.existsSync(rawDir) ? fs.readdirSync(rawDir) : []) {
  if (!f.startsWith('testssl-') || !f.endsWith('.json')) continue
  const host = f.replace('testssl-', '').replace('.json', '')
  const data = safeParse(path.join(rawDir, f))
  const entries = Array.isArray(data) ? data : (data?.scanResult?.[0] ? Object.values(data.scanResult[0]).flat() : [])
  for (const e of entries) {
    const sev = (e?.severity ?? '').toUpperCase()
    if (!TESTSSL_SEVERITIES.has(sev)) continue
    findings.push({
      tool: 'testssl.sh',
      severity: sev,
      title: e.id ?? 'TLS finding',
      file: host,
      extra: e.finding ?? '',
      cwe: e.cwe ?? '',
    })
  }
}

/* ── Agrégation ──────────────────────────────────────────────────── */
const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'ERROR', 'MEDIUM', 'WARNING', 'LOW', 'MODERATE', 'INFO', 'UNKNOWN']
function severityRank(s) {
  const i = SEVERITY_ORDER.indexOf(s)
  return i === -1 ? SEVERITY_ORDER.length : i
}
findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))

const bySeverityBucket = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
for (const f of findings) {
  const s = f.severity
  if (['CRITICAL'].includes(s)) bySeverityBucket.critical++
  else if (['HIGH', 'ERROR'].includes(s)) bySeverityBucket.high++
  else if (['MEDIUM', 'MODERATE', 'WARNING'].includes(s)) bySeverityBucket.medium++
  else if (['LOW'].includes(s)) bySeverityBucket.low++
  else bySeverityBucket.info++
}

const byTool = {}
for (const f of findings) byTool[f.tool] = (byTool[f.tool] ?? 0) + 1

// Score simple sur 100 — pénalise fort le critique/élevé, très léger le
// faible/info (par construction déjà classés comme peu risqués par les
// outils eux-mêmes ; ce résumé automatique ne reflète PAS la triage
// manuelle — voir le rapport final pour le score réel post-vérification).
// Indicatif uniquement, pas une norme externe.
const penalty = bySeverityBucket.critical * 15 + bySeverityBucket.high * 5 + bySeverityBucket.medium * 1 + bySeverityBucket.low * 0.15
const score = Math.max(0, Math.round(100 - penalty))

/* ── SUMMARY.md ──────────────────────────────────────────────────── */
const md = []
md.push(`# Résumé de l'audit de sécurité — ${ts}`)
md.push('')
md.push(`**Score brut (outils, avant triage manuel) : ${score}/100**`)
md.push('')
md.push("> Ce score est un décompte mécanique des sévérités renvoyées par les outils, avant toute vérification humaine — il compte donc aussi les faux positifs. Voir le rapport final (SECURITY-REPORT.md / .html) pour le score réel après triage.")
md.push('')
md.push('| Sévérité | Nombre |')
md.push('|---|---|')
md.push(`| Critique | ${bySeverityBucket.critical} |`)
md.push(`| Élevée | ${bySeverityBucket.high} |`)
md.push(`| Moyenne | ${bySeverityBucket.medium} |`)
md.push(`| Faible | ${bySeverityBucket.low} |`)
md.push(`| Info | ${bySeverityBucket.info} |`)
md.push('')
md.push('## Par outil')
md.push('')
md.push('| Outil | Findings |')
md.push('|---|---|')
for (const [tool, n] of Object.entries(byTool).sort((a, b) => b[1] - a[1])) md.push(`| ${tool} | ${n} |`)
md.push('')
md.push('## Détail')
md.push('')
for (const f of findings) {
  md.push(`### [${f.severity}] ${f.title} — ${f.tool}`)
  if (f.file) md.push(`- **Fichier** : \`${f.file}${f.line ? ':' + f.line : ''}\``)
  if (f.owasp) md.push(`- **OWASP** : ${f.owasp}`)
  if (f.cwe) md.push(`- **CWE** : ${f.cwe}`)
  if (f.fix) md.push(`- **Correctif connu** : ${f.fix}`)
  if (f.extra) md.push(`- ${f.extra}`)
  md.push('')
}
md.push('## Non couvert dans cet environnement')
md.push('')
md.push('- **OWASP ZAP / Nuclei** — scanners actifs, exclus délibérément (backend local branché sur la vraie base de production, pas de staging séparé).')
md.push('- **SonarQube** — nécessite un serveur dédié, non déployé pour cet audit.')
md.push('- **Dockle** — nécessite un daemon Docker, absent de cette machine.')
md.push('- **kube-bench** — aucun cluster Kubernetes dans ce projet.')
md.push('- **GitHub Actions / CI-CD** — aucun workflow trouvé dans `.github/workflows/`.')
fs.writeFileSync(path.join(reportDir, 'SUMMARY.md'), md.join('\n'))

/* ── dashboard.html (léger, auto-généré à chaque run) ───────────────── */
const rows = findings.slice(0, 200).map(f => `
  <tr>
    <td><span class="sev sev-${f.severity.toLowerCase()}">${f.severity}</span></td>
    <td>${f.tool}</td>
    <td>${(f.title ?? '').replace(/</g, '&lt;')}</td>
    <td class="mono">${(f.file ?? '').replace(/</g, '&lt;')}${f.line ? ':' + f.line : ''}</td>
  </tr>`).join('')

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Audit sécurité Skignas — ${ts}</title>
<style>
  body{font-family:-apple-system,sans-serif;background:#14171d;color:#e7e9ee;margin:0;padding:40px}
  h1{font-weight:500} .score{font-size:48px;font-weight:700;color:${score >= 80 ? '#5fcf9f' : score >= 60 ? '#e0ac52' : '#e58080'}}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:24px}
  th{text-align:left;color:#a2a9b5;text-transform:uppercase;font-size:11px;padding:8px;border-bottom:1px solid #2a2f39}
  td{padding:8px;border-bottom:1px solid #2a2f39;vertical-align:top}
  .mono{font-family:ui-monospace,monospace;color:#a2a9b5}
  .sev{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
  .sev-critical{background:#331b1b;color:#e58080} .sev-high,.sev-error{background:#331b1b;color:#e58080}
  .sev-medium,.sev-moderate,.sev-warning{background:#2e2410;color:#e0ac52} .sev-low{background:#1c2740;color:#7fa2f5}
  .sev-info,.sev-unknown{background:#1f232b;color:#767d89}
  .stats{display:flex;gap:24px;margin-top:16px} .stat{background:#1b1f27;border-radius:10px;padding:16px 20px}
  .stat b{display:block;font-size:24px}
</style></head><body>
<h1>Audit de sécurité — Skignas</h1>
<p>${ts}</p>
<div class="score">${score}<span style="font-size:20px;color:#767d89">/100</span></div>
<div class="stats">
  <div class="stat">Critique<b style="color:#e58080">${bySeverityBucket.critical}</b></div>
  <div class="stat">Élevée<b style="color:#e58080">${bySeverityBucket.high}</b></div>
  <div class="stat">Moyenne<b style="color:#e0ac52">${bySeverityBucket.medium}</b></div>
  <div class="stat">Faible<b style="color:#7fa2f5">${bySeverityBucket.low}</b></div>
  <div class="stat">Info<b style="color:#767d89">${bySeverityBucket.info}</b></div>
</div>
<table><thead><tr><th>Sévérité</th><th>Outil</th><th>Finding</th><th>Fichier</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`
fs.writeFileSync(path.join(reportDir, 'dashboard.html'), html)

console.log(`Score: ${score}/100 — ${findings.length} findings (${bySeverityBucket.critical} critiques, ${bySeverityBucket.high} élevées)`)
