import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { logger } from '../lib/logger'
import { getLoyaltySettings } from './loyalty'

const router = Router()

export const REFERRAL_BONUS_POINTS = 200  // points offerts au parrain

/** Retrouve le parrain à partir d'un code saisi à l'inscription — insensible à la casse/aux espaces. */
export async function findReferrer(code?: string) {
  const normalized = code?.trim().toUpperCase()
  if (!normalized) return null
  return prisma.user.findUnique({ where: { referralCode: normalized } })
}

/**
 * Crédite le bonus de parrainage — n'échoue jamais bruyamment : appelée
 * après la création du compte filleul, une erreur ici ne doit pas faire
 * échouer l'inscription elle-même.
 */
export async function awardReferralBonus(referrerId: string, refereeName: string): Promise<void> {
  try {
    const { loyaltyEnabled } = await getLoyaltySettings()
    if (!loyaltyEnabled) return

    await prisma.$transaction([
      prisma.user.update({ where: { id: referrerId }, data: { loyaltyPoints: { increment: REFERRAL_BONUS_POINTS } } }),
      prisma.pointTransaction.create({
        data: { userId: referrerId, type: 'referral', points: REFERRAL_BONUS_POINTS, note: `Parrainage de ${refereeName}` },
      }),
    ])
  } catch (err) {
    logger.error('[referral] échec de l\'attribution du bonus', err)
  }
}

/* GET /api/referral/me — mon code + stats */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.userId },
      select: { referralCode: true, loyaltyPoints: true },
    })
    // générer un code si manquant
    let code = user?.referralCode
    if (!code) {
      code = `SKIGNAS-${req.user!.userId.slice(-6).toUpperCase()}`
      await prisma.user.update({
        where: { id: req.user!.userId },
        data:  { referralCode: code },
      })
    }
    // compter les filleuls
    const [referrals, { loyaltyEnabled }] = await Promise.all([
      prisma.user.count({ where: { referredById: req.user!.userId } }),
      getLoyaltySettings(),
    ])
    res.json({
      success: true,
      data: { code, referrals, bonusPerReferral: REFERRAL_BONUS_POINTS, enabled: loyaltyEnabled },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
