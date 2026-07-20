import type { Request } from 'express';
type AuditParams = {
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
};
/**
 * Journalise une action admin sensible. Échoue silencieusement (log serveur
 * seulement) — un incident sur le journal ne doit jamais bloquer l'action
 * elle-même.
 */
export declare function logAdminAction(req: Request, params: AuditParams): Promise<void>;
export {};
//# sourceMappingURL=auditLog.d.ts.map