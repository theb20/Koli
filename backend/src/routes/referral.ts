import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

const REFERRAL_BONUS_POINTS = 200  // points offerts au parrain

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
      code = `KOLI-${req.user!.userId.slice(-6).toUpperCase()}`
      await prisma.user.update({
        where: { id: req.user!.userId },
        data:  { referralCode: code },
      })
    }
    // compter les filleuls
    const referrals = await prisma.user.count({
      where: { referredById: req.user!.userId },
    })
    res.json({
      success: true,
      data: { code, referrals, bonusPerReferral: REFERRAL_BONUS_POINTS },
    })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
