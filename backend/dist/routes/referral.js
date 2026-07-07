"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const REFERRAL_BONUS_POINTS = 200; // points offerts au parrain
/* GET /api/referral/me — mon code + stats */
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { referralCode: true, loyaltyPoints: true },
        });
        // générer un code si manquant
        let code = user?.referralCode;
        if (!code) {
            code = `SKIGNAS-${req.user.userId.slice(-6).toUpperCase()}`;
            await prisma_1.prisma.user.update({
                where: { id: req.user.userId },
                data: { referralCode: code },
            });
        }
        // compter les filleuls
        const referrals = await prisma_1.prisma.user.count({
            where: { referredById: req.user.userId },
        });
        res.json({
            success: true,
            data: { code, referrals, bonusPerReferral: REFERRAL_BONUS_POINTS },
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=referral.js.map