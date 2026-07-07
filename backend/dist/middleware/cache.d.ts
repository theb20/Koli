import type { Request, Response, NextFunction } from 'express';
/** Ajoute un Cache-Control public — pour les réponses en lecture seule, non personnalisées. */
export declare function cacheControl(maxAgeSeconds: number): (_req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=cache.d.ts.map