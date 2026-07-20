import sharp from 'sharp'

/**
 * Convertit n'importe quelle image (jpeg, png, heic/heif, gif animé, webp…)
 * en WebP — format unique de stockage pour tous les uploads du site.
 * `.rotate()` sans argument applique l'orientation EXIF puis la retire,
 * indispensable pour les photos prises depuis un téléphone.
 */
export async function toWebp(input: Buffer, quality = 82): Promise<Buffer> {
  return sharp(input, { animated: true })
    .rotate()
    .webp({ quality })
    .toBuffer()
}
