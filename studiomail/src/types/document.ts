import { z } from 'zod'

/* ─────────────────────────────────────────────────────────────
   Modèle de document — un Document a des Sections, une Section a des
   Blocks, un block "columns" a des colonnes de LeafBlock (pas de blocs
   imbriqués au-delà de deux niveaux : volontairement plus simple qu'un
   arbre récursif libre, suffisant pour un e-mail et beaucoup plus sûr à
   rendre en HTML table-based).

   Ce fichier est la SEULE source de vérité du format — l'éditeur (canvas),
   le JSON sauvegardé et le HTML exporté partagent tous ce même modèle
   (voir lib/blocks/render.tsx et lib/html/renderDocumentHtml.ts, qui
   consomment exactement cette structure).
───────────────────────────────────────────────────────────── */

export const spacingSchema = z.object({
  top:    z.number().min(0).max(160),
  right:  z.number().min(0).max(160),
  bottom: z.number().min(0).max(160),
  left:   z.number().min(0).max(160),
})
export type Spacing = z.infer<typeof spacingSchema>

const blockBase = {
  id: z.string(),
  hiddenOnMobile: z.boolean(),
  hiddenOnDesktop: z.boolean(),
  padding: spacingSchema,
  backgroundColor: z.string().nullable(),
}

export const headingBlockSchema = z.object({
  ...blockBase,
  type: z.literal('heading'),
  text: z.string(),
  level: z.enum(['h1', 'h2', 'h3']),
  align: z.enum(['left', 'center', 'right']),
  color: z.string(),
  fontSize: z.number().min(12).max(64),
  fontFamily: z.enum(['sans', 'serif']),
})
export type HeadingBlock = z.infer<typeof headingBlockSchema>

export const paragraphBlockSchema = z.object({
  ...blockBase,
  type: z.literal('paragraph'),
  // HTML de confiance limité — assaini avant rendu (voir lib/sanitizeRichText.ts),
  // seules les balises b/strong/i/em/a/ul/ol/li/br sont conservées.
  html: z.string(),
  align: z.enum(['left', 'center', 'right']),
  color: z.string(),
  fontSize: z.number().min(10).max(28),
})
export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>

export const dividerBlockSchema = z.object({
  ...blockBase,
  type: z.literal('divider'),
  color: z.string(),
  thickness: z.number().min(1).max(8),
})
export type DividerBlock = z.infer<typeof dividerBlockSchema>

export const spacerBlockSchema = z.object({
  ...blockBase,
  type: z.literal('spacer'),
  height: z.number().min(4).max(240),
})
export type SpacerBlock = z.infer<typeof spacerBlockSchema>

export const imageBlockSchema = z.object({
  ...blockBase,
  type: z.literal('image'),
  src: z.string(),
  alt: z.string(),
  link: z.string().nullable(),
  widthPct: z.number().min(10).max(100),
  radius: z.number().min(0).max(40),
  align: z.enum(['left', 'center', 'right']),
})
export type ImageBlock = z.infer<typeof imageBlockSchema>

export const buttonBlockSchema = z.object({
  ...blockBase,
  type: z.literal('button'),
  label: z.string(),
  href: z.string(),
  align: z.enum(['left', 'center', 'right']),
  bgColor: z.string(),
  textColor: z.string(),
  radius: z.number().min(0).max(40),
  fullWidth: z.boolean(),
  fontSize: z.number().min(10).max(22),
})
export type ButtonBlock = z.infer<typeof buttonBlockSchema>

export const socialPlatformSchema = z.enum(['facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'youtube', 'whatsapp'])
export type SocialPlatform = z.infer<typeof socialPlatformSchema>

export const socialBlockSchema = z.object({
  ...blockBase,
  type: z.literal('social'),
  align: z.enum(['left', 'center', 'right']),
  iconSize: z.number().min(16).max(48),
  links: z.array(z.object({ id: z.string(), platform: socialPlatformSchema, url: z.string() })),
})
export type SocialBlock = z.infer<typeof socialBlockSchema>

export const footerBlockSchema = z.object({
  ...blockBase,
  type: z.literal('footer'),
  companyName: z.string(),
  address: z.string(),
  unsubscribeLabel: z.string(),
  unsubscribeUrl: z.string().nullable(),
  color: z.string(),
  align: z.enum(['left', 'center', 'right']),
})
export type FooterBlock = z.infer<typeof footerBlockSchema>

export const logoBlockSchema = z.object({
  ...blockBase,
  type: z.literal('logo'),
  src: z.string(),
  alt: z.string(),
  widthPx: z.number().min(24).max(320),
  align: z.enum(['left', 'center', 'right']),
})
export type LogoBlock = z.infer<typeof logoBlockSchema>

export const htmlBlockSchema = z.object({
  ...blockBase,
  type: z.literal('html'),
  // Bloc avancé — jamais injecté tel quel sans assainissement (voir
  // lib/sanitizeRichText.ts/sanitizeCustomHtml) : scripts/iframes/on* retirés.
  html: z.string(),
})
export type HtmlBlock = z.infer<typeof htmlBlockSchema>

/** Blocs autorisés DANS une colonne — jamais "columns" lui-même (pas d'imbrication). */
export const leafBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema, paragraphBlockSchema, dividerBlockSchema, spacerBlockSchema,
  imageBlockSchema, buttonBlockSchema, socialBlockSchema, footerBlockSchema, logoBlockSchema, htmlBlockSchema,
])
export type LeafBlock = z.infer<typeof leafBlockSchema>

export const columnItemSchema = z.object({
  id: z.string(),
  widthPct: z.number().min(10).max(100),
  blocks: z.array(leafBlockSchema),
})
export type ColumnItem = z.infer<typeof columnItemSchema>

export const columnsBlockSchema = z.object({
  ...blockBase,
  type: z.literal('columns'),
  columns: z.array(columnItemSchema).min(1).max(4),
  gap: z.number().min(0).max(48),
  stackOnMobile: z.boolean(),
})
export type ColumnsBlock = z.infer<typeof columnsBlockSchema>

export const blockSchema = z.discriminatedUnion('type', [
  headingBlockSchema, paragraphBlockSchema, dividerBlockSchema, spacerBlockSchema,
  imageBlockSchema, buttonBlockSchema, socialBlockSchema, footerBlockSchema, logoBlockSchema, htmlBlockSchema,
  columnsBlockSchema,
])
export type Block = z.infer<typeof blockSchema>
export type BlockType = Block['type']

export const sectionSchema = z.object({
  id: z.string(),
  backgroundColor: z.string(),
  contentWidthPx: z.number().min(320).max(760),
  padding: spacingSchema,
  blocks: z.array(blockSchema),
})
export type Section = z.infer<typeof sectionSchema>

export const emailDocumentSchema = z.object({
  subject: z.string(),
  preheader: z.string(),
  pageBackground: z.string(),
  fontFamily: z.enum(['sans', 'serif']),
  sections: z.array(sectionSchema),
})
export type EmailDocument = z.infer<typeof emailDocumentSchema>

export const PROJECT_CATEGORIES = [
  'newsletter', 'onboarding', 'product-launch', 'promotion', 'abandoned-cart',
  'order-confirmation', 'invoice', 'password-reset', 'transactional', 'b2b-outreach',
  'event', 'internal', 'custom',
] as const
export type ProjectCategory = typeof PROJECT_CATEGORIES[number]

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.custom<ProjectCategory>(v => typeof v === 'string'),
  favorite: z.boolean(),
  /** Un projet marqué modèle apparaît dans "Commencer à partir de" (Nouveau
   *  projet), à côté des modèles intégrés — voir ProjectsPage/NewProjectModal.
   *  default(false) : les projets déjà enregistrés avant l'ajout de ce champ
   *  restent lisibles (pas de perte de données au chargement). */
  isTemplate: z.boolean().default(false),
  document: emailDocumentSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Project = z.infer<typeof projectSchema>

/** Format d'échange JSON (import/export) — versionné dès le départ. */
export const PROJECT_FILE_VERSION = 1
export const projectFileSchema = z.object({
  formatVersion: z.literal(PROJECT_FILE_VERSION),
  project: projectSchema,
})
export type ProjectFile = z.infer<typeof projectFileSchema>
