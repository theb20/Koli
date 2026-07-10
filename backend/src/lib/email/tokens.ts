/* ─────────────────────────────────────────────────────────────
   Design tokens des emails — remplace l'ancienne approche
   "surcharge de <style>" (voir git history: emailDesignCss).

   Pourquoi : le design visible des emails (header, carte, footer)
   est fait en styles inline (obligatoire pour Gmail mobile/Outlook,
   qui ignorent largement <head><style>). Un <style> surchargé ne
   peut donc jamais l'emporter sur un style inline existant — cette
   approche était structurellement inopérante. Les tokens sont
   injectés directement dans les styles inline au moment du rendu.

   Sécurité : chaque token est validé par liste blanche stricte
   avant d'être interpolé dans du HTML — jamais de valeur libre.
───────────────────────────────────────────────────────────── */
import { AsyncLocalStorage } from 'node:async_hooks'
import { prisma } from '../prisma'

export type EmailDesignTokens = {
  primaryColor:       string
  headerGradientFrom: string
  headerGradientTo:   string
  cardRadius:         number
  cardBg:             string
  bodyBg:             string
  footerText:         string
  logoUrl:            string
  badgeText:           string
}

export const DEFAULT_TOKENS: EmailDesignTokens = {
  primaryColor:       '#1a73e8',
  // Header à plat (pas de dégradé) — même couleur des deux côtés, matérialise
  // le style "Google Material" : fond blanc, liseré 4 couleurs, logo noir.
  headerGradientFrom: '#ffffff',
  headerGradientTo:   '#ffffff',
  cardRadius:         16,
  cardBg:             '#ffffff',
  bodyBg:             '#f1f3f4',
  footerText:         'Vous recevez cet email car vous avez un compte Skignas.',
  logoUrl:            'https://skignas.com/imgs_dropship/skignas_black.png',
  badgeText:           "Côte d'Ivoire",
}

/* ── Validation liste blanche — un token invalide retombe sur le défaut ──
   Exportées pour être réutilisées telles quelles par la validation Zod
   stricte de PUT /design/tokens (même règles, deux points d'application). */
export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/
// https uniquement, domaine avec au moins un point — exclut javascript:, data:, chemins relatifs...
export const HTTPS_URL_RE = /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s"'<>]*)?$/

/** Échappement HTML — appliqué systématiquement en sortie (getEmailTokens),
 *  jamais uniquement en entrée : une valeur en base ne doit jamais être
 *  considérée sûre par construction. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function validColor(v: unknown, fallback: string): string {
  return typeof v === 'string' && HEX_COLOR_RE.test(v) ? v : fallback
}
function validUrl(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length <= 500 && HTTPS_URL_RE.test(v) ? v : fallback
}
function validRadius(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isInteger(n) && n >= 0 && n <= 40 ? n : fallback
}
function validText(v: unknown, fallback: string, maxLen: number): string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxLen ? v.trim() : fallback
}

/** Valide un lot partiel de tokens — ne garde que les champs conformes, ignore le reste. */
export function sanitizeTokens(input: Record<string, unknown>): Partial<EmailDesignTokens> {
  const out: Partial<EmailDesignTokens> = {}
  if ('primaryColor'       in input) out.primaryColor       = validColor(input['primaryColor'], DEFAULT_TOKENS.primaryColor)
  if ('headerGradientFrom' in input) out.headerGradientFrom = validColor(input['headerGradientFrom'], DEFAULT_TOKENS.headerGradientFrom)
  if ('headerGradientTo'   in input) out.headerGradientTo   = validColor(input['headerGradientTo'], DEFAULT_TOKENS.headerGradientTo)
  if ('cardRadius'         in input) out.cardRadius         = validRadius(input['cardRadius'], DEFAULT_TOKENS.cardRadius)
  if ('cardBg'             in input) out.cardBg             = validColor(input['cardBg'], DEFAULT_TOKENS.cardBg)
  if ('bodyBg'             in input) out.bodyBg             = validColor(input['bodyBg'], DEFAULT_TOKENS.bodyBg)
  if ('footerText'         in input) out.footerText         = validText(input['footerText'], DEFAULT_TOKENS.footerText, 200)
  if ('logoUrl'            in input) out.logoUrl            = validUrl(input['logoUrl'], DEFAULT_TOKENS.logoUrl)
  if ('badgeText'          in input) out.badgeText          = validText(input['badgeText'], DEFAULT_TOKENS.badgeText, 40)
  return out
}

/**
 * Contexte de prévisualisation — permet à GET /api/email-templates/:name de
 * rendre un template avec des tokens "brouillon" (pas encore sauvegardés)
 * sans jamais toucher d'état global partagé. Isolé par requête grâce à
 * AsyncLocalStorage : deux requêtes concurrentes ne peuvent pas s'écraser
 * l'une l'autre (contrairement à une variable module mutable).
 */
export const tokenPreviewContext = new AsyncLocalStorage<Partial<EmailDesignTokens>>()

/**
 * Tokens effectifs (bruts, non échappés) : brouillon de prévisualisation >
 * base > défauts codés en dur. Utilisé par la route GET /design/tokens —
 * ces valeurs sont destinées à être réaffichées dans un formulaire
 * d'édition, pas interpolées dans du HTML (voir getEmailTokens pour ça).
 */
export async function getRawEmailTokens(): Promise<EmailDesignTokens> {
  const draft = tokenPreviewContext.getStore()
  if (draft) return { ...DEFAULT_TOKENS, ...draft }

  try {
    const s = await prisma.siteSettings.findUnique({ where: { id: 1 } })
    if (!s) return DEFAULT_TOKENS
    return {
      primaryColor:       s.emailPrimaryColor       ?? DEFAULT_TOKENS.primaryColor,
      headerGradientFrom: s.emailHeaderGradientFrom ?? DEFAULT_TOKENS.headerGradientFrom,
      headerGradientTo:   s.emailHeaderGradientTo   ?? DEFAULT_TOKENS.headerGradientTo,
      cardRadius:         s.emailCardRadius         ?? DEFAULT_TOKENS.cardRadius,
      cardBg:             s.emailCardBg             ?? DEFAULT_TOKENS.cardBg,
      bodyBg:             s.emailBodyBg             ?? DEFAULT_TOKENS.bodyBg,
      footerText:         s.emailFooterText         ?? DEFAULT_TOKENS.footerText,
      logoUrl:            s.emailLogoUrl            ?? DEFAULT_TOKENS.logoUrl,
      badgeText:           s.emailBadgeText           ?? DEFAULT_TOKENS.badgeText,
    }
  } catch {
    return DEFAULT_TOKENS
  }
}

/**
 * Tokens prêts à être interpolés dans du HTML (échappés) — c'est la version
 * que baseLayout() doit utiliser. Ne jamais réutiliser cette version pour
 * réafficher les valeurs dans un formulaire d'édition (l'échappement y
 * apparaîtrait littéralement, ex: "Côte d&#39;Ivoire" dans un <input>).
 */
export async function getEmailTokens(): Promise<EmailDesignTokens> {
  const raw = await getRawEmailTokens()
  return {
    ...raw,
    footerText: escapeHtml(raw.footerText),
    badgeText:  escapeHtml(raw.badgeText),
  }
}
