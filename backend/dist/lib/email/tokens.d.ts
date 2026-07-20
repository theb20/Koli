import { AsyncLocalStorage } from 'node:async_hooks';
export type EmailDesignTokens = {
    primaryColor: string;
    headerGradientFrom: string;
    headerGradientTo: string;
    cardRadius: number;
    cardBg: string;
    bodyBg: string;
    footerText: string;
    logoUrl: string;
    logoWidth: number;
    logoHeight: number;
    badgeText: string;
};
export declare const DEFAULT_TOKENS: EmailDesignTokens;
export declare const HEX_COLOR_RE: RegExp;
export declare const HTTPS_URL_RE: RegExp;
/** Valide un lot partiel de tokens — ne garde que les champs conformes, ignore le reste. */
export declare function sanitizeTokens(input: Record<string, unknown>): Partial<EmailDesignTokens>;
/**
 * Contexte de prévisualisation — permet à GET /api/email-templates/:name de
 * rendre un template avec des tokens "brouillon" (pas encore sauvegardés)
 * sans jamais toucher d'état global partagé. Isolé par requête grâce à
 * AsyncLocalStorage : deux requêtes concurrentes ne peuvent pas s'écraser
 * l'une l'autre (contrairement à une variable module mutable).
 */
export declare const tokenPreviewContext: AsyncLocalStorage<Partial<EmailDesignTokens>>;
/**
 * Tokens effectifs (bruts, non échappés) : brouillon de prévisualisation >
 * base > défauts codés en dur. Utilisé par la route GET /design/tokens —
 * ces valeurs sont destinées à être réaffichées dans un formulaire
 * d'édition, pas interpolées dans du HTML (voir getEmailTokens pour ça).
 */
export declare function getRawEmailTokens(): Promise<EmailDesignTokens>;
/**
 * Tokens prêts à être interpolés dans du HTML (échappés) — c'est la version
 * que baseLayout() doit utiliser. Ne jamais réutiliser cette version pour
 * réafficher les valeurs dans un formulaire d'édition (l'échappement y
 * apparaîtrait littéralement, ex: "Côte d&#39;Ivoire" dans un <input>).
 */
export declare function getEmailTokens(): Promise<EmailDesignTokens>;
//# sourceMappingURL=tokens.d.ts.map