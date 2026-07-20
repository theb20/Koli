"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAdminAction = logAdminAction;
const prisma_1 = require("./prisma");
const logger_1 = require("./logger");
/**
 * Journalise une action admin sensible. Échoue silencieusement (log serveur
 * seulement) — un incident sur le journal ne doit jamais bloquer l'action
 * elle-même.
 */
async function logAdminAction(req, params) {
    try {
        await prisma_1.prisma.auditLog.create({
            data: {
                actorId: req.user?.userId ?? null,
                actorEmail: req.user?.email ?? null,
                action: params.action,
                targetType: params.targetType,
                targetId: params.targetId,
                metadata: params.metadata ? JSON.stringify(params.metadata) : null,
                ip: req.ip ?? null,
            },
        });
    }
    catch (err) {
        logger_1.logger.error('[audit-log]', err);
    }
}
//# sourceMappingURL=auditLog.js.map