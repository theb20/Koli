import { prisma } from './prisma.js'

/**
 * Génère le prochain numéro de document et incrémente le compteur en base
 * de façon atomique (update ... increment, dans le sens du besoin métier :
 * deux créations concurrentes ne doivent jamais recevoir le même numéro).
 */
export async function nextProformaNumber(companyId: string): Promise<string> {
  const settings = await prisma.documentSettings.update({
    where: { companyId },
    data: { proformaCounter: { increment: 1 } },
  })
  return applyFormat(settings.proformaNumberFmt, settings.proformaPrefix, settings.proformaCounter)
}

export async function nextInvoiceNumber(companyId: string): Promise<string> {
  const settings = await prisma.documentSettings.update({
    where: { companyId },
    data: { invoiceCounter: { increment: 1 } },
  })
  return applyFormat(settings.invoiceNumberFmt, settings.invoicePrefix, settings.invoiceCounter)
}

function applyFormat(format: string, prefix: string, counter: number): string {
  const year = new Date().getFullYear()
  return format
    .replace('{PREFIX}', prefix)
    .replace('{YEAR}', String(year))
    .replace('{NUMBER}', String(counter).padStart(4, '0'))
}
