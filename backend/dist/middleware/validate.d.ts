import type { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
/** Valide req.body avec un schema Zod */
export declare function validate<T>(schema: ZodSchema<T>): (req: Request, res: Response, next: NextFunction) => void;
export declare const zPassword: z.ZodString;
//# sourceMappingURL=validate.d.ts.map