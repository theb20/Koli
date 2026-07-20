/**
 * Télécharge une image externe côté serveur (contourne le hotlink-blocking
 * basé sur le Referer navigateur) et la sauvegarde localement.
 * En cas d'échec (timeout, 403, type invalide, IP interne...), retourne
 * l'URL d'origine telle quelle plutôt que de faire échouer l'opération
 * appelante — l'image externe reste utilisable en dégradé.
 */
export declare function rehostImage(sourceUrl: string, backendBaseUrl: string): Promise<string>;
export declare function rehostImages(urls: string[], backendBaseUrl: string): Promise<string[]>;
//# sourceMappingURL=rehostImage.d.ts.map