import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { prisma } from '../lib/prisma.js'
import { requireAuth, getMembership, type AuthedRequest } from '../middleware/auth.js'
import { sendTeamInviteEmail } from '../lib/email.js'

export const companiesRouter = Router()
companiesRouter.use(requireAuth)

const uploadsDir = path.resolve('uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Format non supporté (PNG, JPG, WEBP ou SVG uniquement)'))
    }
    cb(null, true)
  },
})

companiesRouter.get('/', async (req: AuthedRequest, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.userId },
    include: { company: true },
    orderBy: { createdAt: 'asc' },
  })
  const companies = memberships.map((m) => ({ ...m.company, myRole: m.role }))
  res.json({ success: true, companies })
})

const companySchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  taxId: z.string().optional(),
  rccm: z.string().optional(),
  legalInfo: z.string().optional(),
})

companiesRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = companySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })

  const company = await prisma.company.create({
    data: { ...parsed.data, userId: req.userId! },
  })
  await prisma.documentSettings.create({ data: { companyId: company.id } })
  await prisma.membership.create({ data: { userId: req.userId!, companyId: company.id, role: 'ADMIN' } })

  res.status(201).json({ success: true, company: { ...company, myRole: 'ADMIN' as const } })
})

async function loadOwnedCompany(userId: string, id: string) {
  const membership = await getMembership(userId, id)
  if (!membership) return null
  const company = await prisma.company.findUnique({ where: { id } })
  return company ? { ...company, myRole: membership.role } : null
}

companiesRouter.get('/:id', async (req: AuthedRequest, res) => {
  const company = await loadOwnedCompany(req.userId!, req.params.id)
  if (!company) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  res.json({ success: true, company })
})

companiesRouter.put('/:id', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedCompany(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  if (owned.myRole !== 'ADMIN') return res.status(403).json({ success: false, message: 'Seul un administrateur peut modifier ces informations' })
  const parsed = companySchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })
  const company = await prisma.company.update({ where: { id: owned.id }, data: parsed.data })
  res.json({ success: true, company })
})

companiesRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedCompany(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  if (owned.myRole !== 'ADMIN') return res.status(403).json({ success: false, message: 'Seul un administrateur peut supprimer l’entreprise' })
  await prisma.company.delete({ where: { id: owned.id } })
  res.json({ success: true })
})

// ── Équipe (multi-utilisateurs avec rôles) ──────────────────────────────
companiesRouter.get('/:id/members', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedCompany(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  const members = await prisma.membership.findMany({
    where: { companyId: owned.id },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ success: true, members })
})

const inviteSchema = z.object({ email: z.string().email(), role: z.enum(['ADMIN', 'COMMERCIAL', 'COMPTABLE']) })
companiesRouter.post('/:id/members', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedCompany(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  if (owned.myRole !== 'ADMIN') return res.status(403).json({ success: false, message: 'Seul un administrateur peut inviter des membres' })

  const parsed = inviteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })

  const targetUser = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: "Aucun compte n'existe avec cet email — la personne doit d'abord créer un compte Proforma avant de pouvoir être ajoutée.",
    })
  }

  const existing = await getMembership(targetUser.id, owned.id)
  if (existing) return res.status(409).json({ success: false, message: 'Cette personne fait déjà partie de l’entreprise' })

  const membership = await prisma.membership.create({
    data: { userId: targetUser.id, companyId: owned.id, role: parsed.data.role },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  })

  try {
    const inviter = await prisma.user.findUnique({ where: { id: req.userId }, select: { firstName: true, lastName: true } })
    await sendTeamInviteEmail({
      to: targetUser.email,
      companyName: owned.name,
      role: parsed.data.role,
      inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}` : 'Un administrateur',
    })
  } catch {
    // L'ajout reste effectif même si l'email de notification échoue (ex: Resend non configuré)
  }

  res.status(201).json({ success: true, member: membership })
})

const updateRoleSchema = z.object({ role: z.enum(['ADMIN', 'COMMERCIAL', 'COMPTABLE']) })
companiesRouter.put('/:id/members/:membershipId', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedCompany(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  if (owned.myRole !== 'ADMIN') return res.status(403).json({ success: false, message: 'Seul un administrateur peut modifier les rôles' })

  const parsed = updateRoleSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Rôle invalide' })

  const target = await prisma.membership.findFirst({ where: { id: req.params.membershipId, companyId: owned.id } })
  if (!target) return res.status(404).json({ success: false, message: 'Membre introuvable' })

  if (target.userId === req.userId && parsed.data.role !== 'ADMIN') {
    const otherAdmins = await prisma.membership.count({ where: { companyId: owned.id, role: 'ADMIN', userId: { not: req.userId } } })
    if (otherAdmins === 0) return res.status(409).json({ success: false, message: 'Impossible : vous êtes le dernier administrateur' })
  }

  const member = await prisma.membership.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  })
  res.json({ success: true, member })
})

companiesRouter.delete('/:id/members/:membershipId', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedCompany(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  if (owned.myRole !== 'ADMIN') return res.status(403).json({ success: false, message: 'Seul un administrateur peut retirer un membre' })

  const target = await prisma.membership.findFirst({ where: { id: req.params.membershipId, companyId: owned.id } })
  if (!target) return res.status(404).json({ success: false, message: 'Membre introuvable' })

  if (target.role === 'ADMIN') {
    const otherAdmins = await prisma.membership.count({ where: { companyId: owned.id, role: 'ADMIN', id: { not: target.id } } })
    if (otherAdmins === 0) return res.status(409).json({ success: false, message: 'Impossible de retirer le dernier administrateur' })
  }

  await prisma.membership.delete({ where: { id: target.id } })
  res.json({ success: true })
})

companiesRouter.post('/:id/logo', upload.single('logo'), async (req: AuthedRequest, res) => {
  const owned = await loadOwnedCompany(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  if (owned.myRole !== 'ADMIN') return res.status(403).json({ success: false, message: 'Seul un administrateur peut modifier le logo' })
  if (!req.file) return res.status(400).json({ success: false, message: 'Fichier manquant' })

  const logoUrl = `/uploads/${req.file.filename}`
  const company = await prisma.company.update({ where: { id: owned.id }, data: { logoUrl } })
  res.json({ success: true, company })
})

companiesRouter.delete('/:id/logo', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedCompany(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  if (owned.myRole !== 'ADMIN') return res.status(403).json({ success: false, message: 'Seul un administrateur peut modifier le logo' })
  const company = await prisma.company.update({ where: { id: owned.id }, data: { logoUrl: null } })
  res.json({ success: true, company })
})

companiesRouter.get('/:id/settings', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedCompany(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  const settings = await prisma.documentSettings.findUnique({ where: { companyId: owned.id } })
  res.json({ success: true, settings })
})

const settingsSchema = z.object({
  proformaPrefix: z.string().min(1).optional(),
  proformaNumberFmt: z.string().optional(),
  invoicePrefix: z.string().min(1).optional(),
  invoiceNumberFmt: z.string().optional(),
  defaultCurrency: z.enum(['XOF', 'EUR', 'USD', 'GBP']).optional(),
  defaultTemplate: z.enum(['classic', 'modern', 'minimal', 'corporate', 'elegant']).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  defaultNotes: z.string().nullable().optional(),
  defaultTerms: z.string().nullable().optional(),
  defaultFooter: z.string().nullable().optional(),
  emailSenderName: z.string().nullable().optional(),
  emailSignature: z.string().nullable().optional(),
})

companiesRouter.put('/:id/settings', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedCompany(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  if (owned.myRole !== 'ADMIN') return res.status(403).json({ success: false, message: 'Seul un administrateur peut modifier les paramètres' })
  const parsed = settingsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })
  const settings = await prisma.documentSettings.update({ where: { companyId: owned.id }, data: parsed.data })
  res.json({ success: true, settings })
})

// ── Recherche globale (proformas, factures, clients, produits) ────────────
companiesRouter.get('/:id/search', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedCompany(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  const q = String(req.query.q || '').trim()
  if (!q) return res.json({ success: true, proformas: [], invoices: [], clients: [], products: [] })

  const insensitive = { contains: q, mode: 'insensitive' as const }
  const [proformas, invoices, clients, products] = await Promise.all([
    prisma.proforma.findMany({
      where: { companyId: owned.id, OR: [{ number: insensitive }, { object: insensitive }] },
      take: 5,
      select: { id: true, number: true, total: true, currency: true, status: true },
    }),
    prisma.invoice.findMany({
      where: { companyId: owned.id, OR: [{ number: insensitive }, { object: insensitive }] },
      take: 5,
      select: { id: true, number: true, total: true, currency: true, status: true },
    }),
    prisma.client.findMany({ where: { companyId: owned.id, name: insensitive }, take: 5, select: { id: true, name: true, email: true } }),
    prisma.product.findMany({ where: { companyId: owned.id, name: insensitive }, take: 5, select: { id: true, name: true, unitPrice: true } }),
  ])

  res.json({ success: true, proformas, invoices, clients, products })
})
