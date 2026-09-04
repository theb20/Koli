import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, getMembership, type AuthedRequest } from '../middleware/auth.js'
import { fromMinorUnits, type Currency } from '../lib/money.js'

export const exportRouter = Router()
exportRouter.use(requireAuth)

async function assertCanExport(userId: string, companyId: string) {
  const membership = await getMembership(userId, companyId)
  return membership && (membership.role === 'ADMIN' || membership.role === 'COMPTABLE')
}

function csvEscape(value: unknown): string {
  const s = String(value ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvEscape).join(';')).join('\n')
}

function parseDateRange(query: Record<string, unknown>) {
  const from = query.from ? new Date(String(query.from)) : new Date(new Date().getFullYear(), 0, 1)
  const to = query.to ? new Date(String(query.to)) : new Date()
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

// Export des proformas et/ou factures en CSV (comptable/export §41)
exportRouter.get('/companies/:companyId/export/csv', async (req: AuthedRequest, res) => {
  if (!(await assertCanExport(req.userId!, req.params.companyId))) {
    return res.status(403).json({ success: false, message: 'Rôle insuffisant pour exporter' })
  }
  const type = req.query.type === 'invoices' ? 'invoices' : 'proformas'
  const { from, to } = parseDateRange(req.query as Record<string, unknown>)

  if (type === 'invoices') {
    const invoices = await prisma.invoice.findMany({
      where: { companyId: req.params.companyId, issueDate: { gte: from, lte: to } },
      include: { client: { select: { name: true, taxId: true } } },
      orderBy: { issueDate: 'asc' },
    })
    const rows: (string | number)[][] = [
      ['Numéro', 'Date', 'Client', 'NIF client', 'Devise', 'Sous-total HT', 'Remise', 'Taxes', 'Frais', 'Total TTC', 'Statut', 'Payée le'],
    ]
    for (const inv of invoices) {
      const currency = inv.currency as Currency
      rows.push([
        inv.number,
        inv.issueDate.toISOString().slice(0, 10),
        inv.client.name,
        inv.client.taxId || '',
        inv.currency,
        fromMinorUnits(inv.subtotal, currency),
        fromMinorUnits(inv.discountAmount, currency),
        fromMinorUnits(inv.taxAmount, currency),
        fromMinorUnits(inv.shippingFee + inv.otherFees, currency),
        fromMinorUnits(inv.total, currency),
        inv.status,
        inv.paidAt ? inv.paidAt.toISOString().slice(0, 10) : '',
      ])
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="factures_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"`)
    res.send('﻿' + toCsv(rows))
    return
  }

  const proformas = await prisma.proforma.findMany({
    where: { companyId: req.params.companyId, issueDate: { gte: from, lte: to } },
    include: { client: { select: { name: true, taxId: true } } },
    orderBy: { issueDate: 'asc' },
  })
  const rows: (string | number)[][] = [
    ['Numéro', 'Date', 'Client', 'NIF client', 'Devise', 'Sous-total HT', 'Remise', 'Taxes', 'Frais', 'Total TTC', 'Statut'],
  ]
  for (const p of proformas) {
    const currency = p.currency as Currency
    rows.push([
      p.number,
      p.issueDate.toISOString().slice(0, 10),
      p.client.name,
      p.client.taxId || '',
      p.currency,
      fromMinorUnits(p.subtotal, currency),
      fromMinorUnits(p.discountAmount, currency),
      fromMinorUnits(p.taxAmount, currency),
      fromMinorUnits(p.shippingFee + p.otherFees, currency),
      fromMinorUnits(p.total, currency),
      p.status,
    ])
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="proformas_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"`)
  res.send('﻿' + toCsv(rows))
})

// Rapport de TVA collectée, groupé par taux — basé sur les factures émises
// (la TVA n'est due qu'une fois la vente ferme, pas sur une simple proforma).
exportRouter.get('/companies/:companyId/export/vat-report', async (req: AuthedRequest, res) => {
  if (!(await assertCanExport(req.userId!, req.params.companyId))) {
    return res.status(403).json({ success: false, message: 'Rôle insuffisant pour exporter' })
  }
  const { from, to } = parseDateRange(req.query as Record<string, unknown>)
  const format = req.query.format === 'csv' ? 'csv' : 'json'

  const items = await prisma.invoiceItem.findMany({
    where: { invoice: { companyId: req.params.companyId, issueDate: { gte: from, lte: to } } },
    include: { invoice: { select: { currency: true } } },
  })

  const byRate = new Map<number, { rate: number; base: number; vat: number; currency: string }>()
  for (const it of items) {
    const currency = it.invoice.currency
    const key = it.taxRate
    const taxableBase = it.lineTotal // déjà net de remise ligne
    const vat = Math.round((taxableBase * it.taxRate) / 100)
    const entry = byRate.get(key) || { rate: key, base: 0, vat: 0, currency }
    entry.base += taxableBase
    entry.vat += vat
    byRate.set(key, entry)
  }

  const rows = [...byRate.values()].sort((a, b) => a.rate - b.rate)

  if (format === 'csv') {
    const csvRows: (string | number)[][] = [['Taux TVA (%)', 'Base imposable HT', 'TVA collectée', 'Devise']]
    for (const r of rows) {
      const currency = r.currency as Currency
      csvRows.push([r.rate, fromMinorUnits(r.base, currency), fromMinorUnits(r.vat, currency), r.currency])
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="rapport_tva_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"`)
    res.send('﻿' + toCsv(csvRows))
    return
  }

  res.json({
    success: true,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    rows: rows.map((r) => ({
      rate: r.rate,
      base: fromMinorUnits(r.base, r.currency as Currency),
      vat: fromMinorUnits(r.vat, r.currency as Currency),
      currency: r.currency,
    })),
  })
})
