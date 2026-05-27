import type { Request, Response, NextFunction } from 'express';
/** Middleware — vérifie le JWT (Bearer header ou cookie) */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
/** Middleware — vérifie le rôle admin */
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void;
/** Middleware — optionnel : injecte req.user si token présent, sans bloquer */
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map