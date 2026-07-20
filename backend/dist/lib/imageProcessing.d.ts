/**
 * Convertit n'importe quelle image (jpeg, png, heic/heif, gif animé, webp…)
 * en WebP — format unique de stockage pour tous les uploads du site.
 * `.rotate()` sans argument applique l'orientation EXIF puis la retire,
 * indispensable pour les photos prises depuis un téléphone.
 */
export declare function toWebp(input: Buffer, quality?: number): Promise<Buffer>;
//# sourceMappingURL=imageProcessing.d.ts.map