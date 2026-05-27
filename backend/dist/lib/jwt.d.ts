export type JwtPayload = {
    userId: string;
    email: string;
    role: string;
};
/** Génère un access token (courte durée) */
export declare function signAccessToken(payload: JwtPayload): string;
/** Génère un refresh token (longue durée) */
export declare function signRefreshToken(payload: Pick<JwtPayload, 'userId'>): string;
/** Vérifie et décode un access token */
export declare function verifyAccessToken(token: string): JwtPayload;
/** Vérifie et décode un refresh token */
export declare function verifyRefreshToken(token: string): Pick<JwtPayload, 'userId'>;
//# sourceMappingURL=jwt.d.ts.map