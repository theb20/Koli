"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.use(auth_1.requireAdmin);
/* ── GET /api/audit-log  [ADMIN] ─────────────────────────────── */
router.get('/', (0, validate_1.validateQuery)(validate_1.zPaginationQuery), async (req, res) => {
    try {
        const { page, limit } = req.query;
        const [total, entries] = await Promise.all([
            prisma_1.prisma.auditLog.count(),
            prisma_1.prisma.auditLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);
        res.json({
            success: true,
            data: {
                entries: entries.map(e => ({ ...e, metadata: e.metadata ? JSON.parse(e.metadata) : null })),
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            },
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=audit-log.js.map